"""
Database Models - SQLAlchemy
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, JSON, DateTime, Date, ForeignKey, Text, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    handle = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    plan = Column(String, default="free")
    created_at = Column(DateTime, default=datetime.utcnow)
    workspaces = relationship("Workspace", back_populates="user")
    owned_disciplines = relationship("Discipline", back_populates="owner")
    disciplines = relationship("UserDiscipline", back_populates="user")
    xp_events = relationship("XPEvent", back_populates="user")

class Workspace(Base):
    __tablename__ = "workspaces"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    mode = Column(String, nullable=False)  # research, trade, game, etc.
    vpn_profile_id = Column(String, nullable=True)
    settings_json = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="workspaces")
    tabs = relationship("Tab", back_populates="workspace", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="workspace", cascade="all, delete-orphan")
    runs = relationship("Run", back_populates="workspace", cascade="all, delete-orphan")

class Tab(Base):
    __tablename__ = "tabs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    url = Column(String, nullable=False)
    title = Column(String, nullable=True)
    status = Column(String, default="active")  # active, sleeping, closed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    workspace = relationship("Workspace", back_populates="tabs")

class Note(Base):
    __tablename__ = "notes"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    content_md = Column(Text, nullable=False)
    sources_json = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    workspace = relationship("Workspace", back_populates="notes")

class Run(Base):
    __tablename__ = "runs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    task = Column(Text, nullable=False)
    status = Column(String, default="pending")  # pending, running, completed, failed
    tokens = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    
    workspace = relationship("Workspace", back_populates="runs")
    artifacts = relationship("Artifact", back_populates="run", cascade="all, delete-orphan")

class Artifact(Base):
    __tablename__ = "artifacts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String, ForeignKey("runs.id"), nullable=False, index=True)
    type = Column(String, nullable=False)  # csv, json, pdf, etc.
    path = Column(String, nullable=False)
    meta_json = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    
    run = relationship("Run", back_populates="artifacts")

class SearchIndex(Base):
    __tablename__ = "search_index"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    url = Column(String, nullable=False, index=True)
    title = Column(String, nullable=True)
    lang = Column(String, default="en")
    chunk_id = Column(String, nullable=True)
    vec = Column(JSON, nullable=True)  # Vector embedding (as JSON array)
    ts = Column(DateTime, default=datetime.utcnow, index=True)

class Download(Base):
    __tablename__ = "downloads"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String, nullable=True, index=True)
    url = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    hash = Column(String, nullable=True)  # SHA-256 checksum
    verdict = Column(String, nullable=True)  # safe, suspicious, malicious
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class AITaskMetric(Base):
    __tablename__ = "ai_task_metrics"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String, nullable=False, index=True)  # success, error
    kind = Column(String, nullable=False, index=True)  # search, agent, chat, summary
    mode = Column(String, nullable=True, index=True)
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)
    latency_ms = Column(Integer, nullable=False)
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    estimated_cost_usd = Column(Float, nullable=True)
    cost_tier = Column(String, nullable=True)  # low, medium, high
    prompt_chars = Column(Integer, nullable=True)
    has_context = Column(Boolean, default=False)
    citations_count = Column(Integer, nullable=True)
    client_id = Column(String, nullable=True, index=True)  # user_id or IP
    error = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)


class Discipline(Base):
    __tablename__ = "disciplines"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    cadence = Column(String, default="daily")  # daily, weekly
    difficulty = Column(Integer, default=1)  # 1-5 scale
    goal_units = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    archived_at = Column(DateTime, nullable=True)

    owner = relationship("User", back_populates="owned_disciplines")
    user_disciplines = relationship("UserDiscipline", back_populates="discipline", cascade="all, delete-orphan")


class UserDiscipline(Base):
    __tablename__ = "user_disciplines"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    discipline_id = Column(String, ForeignKey("disciplines.id"), nullable=False, index=True)
    status = Column(String, default="active")  # active, paused, archived
    created_at = Column(DateTime, default=datetime.utcnow)
    archived_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="disciplines")
    discipline = relationship("Discipline", back_populates="user_disciplines")
    logs = relationship("DisciplineLog", back_populates="user_discipline", cascade="all, delete-orphan")
    streak = relationship("DisciplineStreak", back_populates="user_discipline", uselist=False, cascade="all, delete-orphan")


class DisciplineLog(Base):
    __tablename__ = "discipline_logs"
    __table_args__ = (
        UniqueConstraint("user_discipline_id", "log_date", name="uq_discipline_log_per_day"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_discipline_id = Column(String, ForeignKey("user_disciplines.id"), nullable=False, index=True)
    log_date = Column(Date, nullable=False, index=True)
    value = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    metadata_json = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)

    user_discipline = relationship("UserDiscipline", back_populates="logs")


class DisciplineStreak(Base):
    __tablename__ = "discipline_streaks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_discipline_id = Column(String, ForeignKey("user_disciplines.id"), unique=True, nullable=False)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_logged_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user_discipline = relationship("UserDiscipline", back_populates="streak")


class XPEvent(Base):
    __tablename__ = "xp_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    source = Column(String, nullable=False)  # discipline_log, streak_bonus, etc.
    amount = Column(Integer, nullable=False)
    metadata_json = Column(JSON, default={})
    awarded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="xp_events")

