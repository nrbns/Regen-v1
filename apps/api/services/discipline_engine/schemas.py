from __future__ import annotations

from datetime import datetime, date
from typing import Literal, Optional, List

from pydantic import BaseModel, Field, ConfigDict, conint


class DisciplineCreate(BaseModel):
    owner_id: str = Field(..., description="User ID that owns the template")
    title: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(None, max_length=2000)
    cadence: Literal["daily", "weekly"] = "daily"
    difficulty: conint(ge=1, le=5) = 1
    goal_units: Optional[str] = Field(None, max_length=64)


class DisciplineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
    title: str
    description: Optional[str]
    cadence: str
    difficulty: int
    goal_units: Optional[str]
    created_at: datetime


class EnrollRequest(BaseModel):
    user_id: str
    discipline_id: str


class UserDisciplineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    discipline_id: str
    status: str
    created_at: datetime


class LogEntryCreate(BaseModel):
    user_id: str
    user_discipline_id: str
    value: Optional[float] = None
    notes: Optional[str] = Field(None, max_length=2000)
    logged_at: Optional[datetime] = None


class LogEntryResponse(BaseModel):
    log_id: str
    streak: int
    longest_streak: int
    log_date: date
    xp_awarded: int


class StreakResponse(BaseModel):
    user_discipline_id: str
    current_streak: int
    longest_streak: int
    last_logged_at: Optional[datetime]


class DashboardTask(BaseModel):
    user_discipline_id: str
    title: str
    cadence: str
    due_today: bool
    current_streak: int
    longest_streak: int
    last_logged_at: Optional[datetime]


class DashboardSummary(BaseModel):
    user_id: str
    tasks: List[DashboardTask]
    active_count: int


