from __future__ import annotations

from datetime import datetime, timezone, date
from typing import Tuple

from sqlalchemy.orm import Session

from apps.api.models import (
    Discipline,
    User,
    UserDiscipline,
    DisciplineLog,
    DisciplineStreak,
    XPEvent,
)
from apps.api.services.discipline_engine import schemas
from . import streaks
from .xp import calculate_xp


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _get_user(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("user_not_found")
    return user


def _get_discipline(db: Session, discipline_id: str) -> Discipline:
    discipline = db.query(Discipline).filter(Discipline.id == discipline_id).first()
    if not discipline:
        raise ValueError("discipline_not_found")
    return discipline


def _get_user_discipline(db: Session, user_discipline_id: str) -> UserDiscipline:
    user_disc = db.query(UserDiscipline).filter(UserDiscipline.id == user_discipline_id).first()
    if not user_disc:
        raise ValueError("user_discipline_not_found")
    return user_disc


def create_definition(db: Session, payload: schemas.DisciplineCreate) -> schemas.DisciplineResponse:
    _get_user(db, payload.owner_id)
    record = Discipline(
        owner_id=payload.owner_id,
        title=payload.title,
        description=payload.description,
        cadence=payload.cadence,
        difficulty=payload.difficulty,
        goal_units=payload.goal_units,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return schemas.DisciplineResponse.model_validate(record)


def enroll_user(db: Session, payload: schemas.EnrollRequest) -> schemas.UserDisciplineResponse:
    _get_user(db, payload.user_id)
    discipline = _get_discipline(db, payload.discipline_id)

    existing = (
        db.query(UserDiscipline)
        .filter(
            UserDiscipline.user_id == payload.user_id,
            UserDiscipline.discipline_id == payload.discipline_id,
            UserDiscipline.status == "active",
        )
        .first()
    )
    if existing:
        return schemas.UserDisciplineResponse.model_validate(existing)

    user_disc = UserDiscipline(
        user_id=payload.user_id,
        discipline_id=discipline.id,
        status="active",
    )
    db.add(user_disc)
    db.flush()

    streak = DisciplineStreak(user_discipline_id=user_disc.id)
    db.add(streak)
    db.commit()
    db.refresh(user_disc)
    return schemas.UserDisciplineResponse.model_validate(user_disc)


def _ensure_unique_log(db: Session, user_disc_id: str, log_date: date) -> None:
    exists = (
        db.query(DisciplineLog)
        .filter(
            DisciplineLog.user_discipline_id == user_disc_id,
            DisciplineLog.log_date == log_date,
        )
        .first()
    )
    if exists:
        raise ValueError("log_exists")


def _persist_log(
    db: Session,
    user_disc: UserDiscipline,
    payload: schemas.LogEntryCreate,
    log_date: date,
    log_timestamp: datetime,
) -> Tuple[DisciplineLog, DisciplineStreak, int]:
    _ensure_unique_log(db, user_disc.id, log_date)

    log_record = DisciplineLog(
        user_discipline_id=user_disc.id,
        log_date=log_date,
        value=payload.value,
        notes=payload.notes,
    )
    db.add(log_record)

    streak_record = user_disc.streak
    if streak_record is None:
        streak_record = DisciplineStreak(user_discipline_id=user_disc.id)
        db.add(streak_record)
        db.flush()
    streaks.apply_streak(streak_record, log_timestamp)

    xp_amount = calculate_xp(user_disc.discipline.difficulty, streak_record.current_streak, user_disc.discipline.cadence)
    xp_event = XPEvent(
        user_id=user_disc.user_id,
        source="discipline_log",
        amount=xp_amount,
        metadata_json={
            "discipline_id": user_disc.discipline_id,
            "user_discipline_id": user_disc.id,
            "streak": streak_record.current_streak,
        },
    )
    db.add(xp_event)

    db.commit()
    db.refresh(log_record)
    db.refresh(streak_record)
    return log_record, streak_record, xp_amount


def log_entry(db: Session, payload: schemas.LogEntryCreate) -> schemas.LogEntryResponse:
    user_disc = _get_user_discipline(db, payload.user_discipline_id)
    if user_disc.user_id != payload.user_id:
        raise ValueError("user_mismatch")
    if user_disc.status != "active":
        raise ValueError("discipline_inactive")

    log_timestamp = payload.logged_at or _utcnow()
    log_timestamp = log_timestamp.replace(tzinfo=timezone.utc) if log_timestamp.tzinfo is None else log_timestamp.astimezone(timezone.utc)
    log_date = log_timestamp.date()

    log_record, streak_record, xp_amount = _persist_log(db, user_disc, payload, log_date, log_timestamp)

    return schemas.LogEntryResponse(
        log_id=log_record.id,
        streak=streak_record.current_streak,
        longest_streak=streak_record.longest_streak,
        log_date=log_record.log_date,
        xp_awarded=xp_amount,
    )


def get_streak(db: Session, user_id: str, user_discipline_id: str) -> schemas.StreakResponse:
    user_disc = _get_user_discipline(db, user_discipline_id)
    if user_disc.user_id != user_id:
        raise ValueError("user_mismatch")
    streak_record = user_disc.streak or DisciplineStreak(user_discipline_id=user_disc.id)
    if streak_record.id is None:
        db.add(streak_record)
        db.commit()
        db.refresh(streak_record)
    return schemas.StreakResponse(
        user_discipline_id=user_disc.id,
        current_streak=streak_record.current_streak,
        longest_streak=streak_record.longest_streak,
        last_logged_at=streak_record.last_logged_at,
    )


def get_dashboard_summary(db: Session, user_id: str) -> schemas.DashboardSummary:
    _get_user(db, user_id)
    user_disciplines = (
        db.query(UserDiscipline)
        .filter(UserDiscipline.user_id == user_id, UserDiscipline.status == "active")
        .all()
    )
    tasks = []
    for entry in user_disciplines:
        discipline = entry.discipline
        streak_record = entry.streak
        due_today = streaks.due_today(streak_record, discipline.cadence)
        tasks.append(
            schemas.DashboardTask(
                user_discipline_id=entry.id,
                title=discipline.title,
                cadence=discipline.cadence,
                due_today=due_today,
                current_streak=streak_record.current_streak if streak_record else 0,
                longest_streak=streak_record.longest_streak if streak_record else 0,
                last_logged_at=streak_record.last_logged_at if streak_record else None,
            )
        )
    tasks.sort(key=lambda t: (not t.due_today, -t.current_streak))
    return schemas.DashboardSummary(
        user_id=user_id,
        tasks=tasks,
        active_count=len(tasks),
    )


