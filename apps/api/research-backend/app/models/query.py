"""
Query Models
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.db import Base
import uuid


class Query(Base):
    __tablename__ = "queries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    query_text = Column(Text, nullable=False)
    mode = Column(String(50), default="quick")  # quick, deep
    
    status = Column(String(50), default="pending")  # pending, processing, completed, failed, cancelled
    answer = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    
    sources = Column(JSON, nullable=True)  # Array of source IDs
    citations = Column(JSON, nullable=True)  # Citation metadata
    
    error = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

