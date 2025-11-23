"""
Discipline engine API surface.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from apps.api.database import get_db
from apps.api.services import rate_limiter
from apps.api.services.discipline_engine import (
    schemas,
    create_definition,
    enroll_user,
    log_entry,
    get_streak,
    get_dashboard_summary,
)

router = APIRouter()


@router.post("/definitions", response_model=schemas.DisciplineResponse)
def create_discipline(payload: schemas.DisciplineCreate, db: Session = Depends(get_db)):
    try:
        return create_definition(db, payload)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found")


@router.post("/enroll", response_model=schemas.UserDisciplineResponse)
def enroll(payload: schemas.EnrollRequest, db: Session = Depends(get_db)):
    try:
        return enroll_user(db, payload)
    except ValueError as exc:
        if str(exc) == "discipline_not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discipline not found")
        if str(exc) == "user_not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        raise


@router.post("/log", response_model=schemas.LogEntryResponse)
def log_progress(payload: schemas.LogEntryCreate, db: Session = Depends(get_db)):
    allowed, error = rate_limiter.enforce_rate_limit(payload.user_id, "discipline_log")
    if not allowed:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=error)
    try:
        response = log_entry(db, payload)
    except ValueError as exc:
        message = str(exc)
        if message == "user_mismatch":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User mismatch")
        if message == "discipline_inactive":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Discipline inactive")
        if message == "log_exists":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Log already recorded for this day")
        if message == "user_discipline_not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User discipline not found")
        raise
    finally:
        if allowed and error is None:
            rate_limiter.mark_request(payload.user_id, "discipline_log")
    return response


@router.get("/{user_discipline_id}/streak", response_model=schemas.StreakResponse)
def streak(user_discipline_id: str, user_id: str, db: Session = Depends(get_db)):
    try:
        return get_streak(db, user_id=user_id, user_discipline_id=user_discipline_id)
    except ValueError as exc:
        message = str(exc)
        if message in {"user_mismatch"}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User mismatch")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discipline not found")


@router.get("/dashboard/{user_id}", response_model=schemas.DashboardSummary)
def dashboard(user_id: str, db: Session = Depends(get_db)):
    try:
        return get_dashboard_summary(db, user_id=user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


