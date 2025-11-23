from datetime import datetime, timezone

from apps.api.database import SessionLocal, engine
from apps.api.models import Base, User, Discipline, UserDiscipline, DisciplineLog, XPEvent
from apps.api.services.discipline_engine import schemas
from apps.api.services.discipline_engine import service


def setup_function():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.query(DisciplineLog).delete()
        db.query(UserDiscipline).delete()
        db.query(Discipline).delete()
        db.query(XPEvent).delete()
        db.query(User).delete()
        db.commit()
    finally:
        db.close()


def create_user(db):
    user = User(
        id="user-test-1",
        email="discipline@example.com",
        password_hash="hashed",
        plan="free",
    )
    db.add(user)
    db.commit()
    return user


def test_full_discipline_flow():
    db = SessionLocal()
    try:
        user = create_user(db)

        discipline = service.create_definition(
            db,
            schemas.DisciplineCreate(
                owner_id=user.id,
                title="Hydrate",
                description="Drink water",
                cadence="daily",
                difficulty=2,
            ),
        )

        enrollment = service.enroll_user(
            db,
            schemas.EnrollRequest(user_id=user.id, discipline_id=discipline.id),
        )

        log_response = service.log_entry(
            db,
            schemas.LogEntryCreate(
                user_id=user.id,
                user_discipline_id=enrollment.id,
                value=1,
                logged_at=datetime.now(timezone.utc),
            ),
        )

        assert log_response.streak == 1
        assert log_response.xp_awarded > 0

        streak = service.get_streak(db, user_id=user.id, user_discipline_id=enrollment.id)
        assert streak.current_streak == 1
        assert streak.longest_streak == 1

        dashboard = service.get_dashboard_summary(db, user_id=user.id)
        assert dashboard.active_count == 1
        assert dashboard.tasks[0].title == "Hydrate"
    finally:
        db.close()


