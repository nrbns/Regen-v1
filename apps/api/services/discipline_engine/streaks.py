from __future__ import annotations

from datetime import datetime, date

from apps.api.models import DisciplineStreak


def _normalize(d: datetime | date) -> date:
    if isinstance(d, datetime):
        return d.date()
    return d


def apply_streak(streak: DisciplineStreak, log_dt: datetime) -> DisciplineStreak:
    """
    Update streak counters based on a new log timestamp.
    """
    log_date = _normalize(log_dt)
    last_logged = _normalize(streak.last_logged_at) if streak.last_logged_at else None

    if last_logged is None:
        current = 1
    else:
        delta = (log_date - last_logged).days
        if delta == 0:
            # Same day log shouldn't change streak; caller usually guards but be safe.
            current = streak.current_streak
        elif delta == 1:
            current = streak.current_streak + 1
        else:
            current = 1

    streak.current_streak = current
    streak.longest_streak = max(streak.longest_streak, current)
    streak.last_logged_at = log_dt
    return streak


def due_today(streak: DisciplineStreak | None, cadence: str) -> bool:
    if cadence == "daily":
        if streak is None or streak.last_logged_at is None:
            return True
        return (date.today() - streak.last_logged_at.date()).days >= 1
    if cadence == "weekly":
        if streak is None or streak.last_logged_at is None:
            return True
        return (date.today() - streak.last_logged_at.date()).days >= 7
    return True


