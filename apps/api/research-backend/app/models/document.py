"""
Document Models
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.db import Base
import uuid
import enum


class SourceType(str, enum.Enum):
    PDF = "pdf"
    SNAPSHOT = "snapshot"
    FILE = "file"
    REPO = "repo"
    TAB = "tab"


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    title = Column(Text, nullable=False)
    source_type = Column(SQLEnum(SourceType), nullable=False)
    url = Column(Text, nullable=True)
    s3_path = Column(Text, nullable=True)
    
    metadata = Column(Text, nullable=True)  # JSON string
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Ingestion status
    ingestion_status = Column(String(50), default="pending")  # pending, processing, completed, failed
    ingestion_error = Column(Text, nullable=True)
    chunk_count = Column(Integer, default=0)


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doc_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True)
    
    chunk_order = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    char_start = Column(Integer, nullable=True)
    char_end = Column(Integer, nullable=True)
    page = Column(Integer, nullable=True)
    token_count = Column(Integer, nullable=True)
    
    embedding_id = Column(String(255), nullable=True)  # Reference to vector DB ID
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

