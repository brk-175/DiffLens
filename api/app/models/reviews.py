from sqlalchemy import ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.models.mixins import TimestampMixin
from app.core.config import settings
from typing import Literal


class Review(TimestampMixin, Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int | None] = mapped_column(ForeignKey("tenants.id"))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    guest_token: Mapped[str | None] = mapped_column(String(64), unique=True)

    status: Mapped[str] = mapped_column(String(32), default="queued")
    mode_flags: Mapped[dict] = mapped_column(JSON, default=dict)

    overall_verdict: Mapped[str | None] = mapped_column(String(32))
    risk_level: Mapped[str | None] = mapped_column(String(16))
    short_summary: Mapped[str | None] = mapped_column(Text)

    final_summary_key_takeaways: Mapped[list | None] = mapped_column(JSON)
    final_summary_recommended_next_steps: Mapped[list | None] = mapped_column(JSON)
    error_message: Mapped[str | None] = mapped_column(Text)

    storage_provider: Mapped[str] = mapped_column(String(32), default=settings.STORAGE_PROVIDER)
    storage_bucket: Mapped[str] = mapped_column(String(255), nullable=False, default=settings.MINIO_BUCKET)

    input_blob_path: Mapped[str | None] = mapped_column(Text)
    input_blob_size: Mapped[int | None] = mapped_column(Integer)
    input_blob_hash: Mapped[str | None] = mapped_column(String(128))

    output_blob_path: Mapped[str | None] = mapped_column(Text)
    output_blob_size: Mapped[int | None] = mapped_column(Integer)
    output_blob_hash: Mapped[str | None] = mapped_column(String(128))

    file_count: Mapped[int | None] = mapped_column(Integer)
    issue_count: Mapped[int | None] = mapped_column(Integer)
    severity_counts: Mapped[dict | None] = mapped_column(JSON)

    tenant = relationship("Tenant", back_populates="reviews")
    created_by_user = relationship("User", back_populates="reviews")
    files = relationship("ReviewFile", back_populates="review", cascade="all, delete-orphan")


class ReviewFile(TimestampMixin, Base):
    __tablename__ = "review_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    review_id: Mapped[int] = mapped_column(ForeignKey("reviews.id"))

    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_summary: Mapped[str | None] = mapped_column(Text)
    source_type: Mapped[Literal["pasted", "uploaded"]] = mapped_column(String(16), default="pasted")

    review = relationship("Review", back_populates="files")
    issues = relationship("ReviewIssue", back_populates="review_file", cascade="all, delete-orphan")


class ReviewIssue(TimestampMixin, Base):
    __tablename__ = "review_issues"

    id: Mapped[int] = mapped_column(primary_key=True)
    review_file_id: Mapped[int] = mapped_column(ForeignKey("review_files.id"))

    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    mode_tags: Mapped[list] = mapped_column(JSON, default=list)

    line_start: Mapped[int | None] = mapped_column(Integer)
    line_end: Mapped[int | None] = mapped_column(Integer)

    comment: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_fix_blob_path: Mapped[str | None] = mapped_column(Text)

    review_file = relationship("ReviewFile", back_populates="issues")
    details = relationship(
        "ReviewIssueDetails",
        back_populates="issue",
        uselist=False,
        cascade="all, delete-orphan",
    )


class ReviewIssueDetails(TimestampMixin, Base):
    __tablename__ = "review_issue_details"

    id: Mapped[int] = mapped_column(primary_key=True)
    review_issue_id: Mapped[int] = mapped_column(ForeignKey("review_issues.id"))

    what_is_wrong: Mapped[str | None] = mapped_column(Text)
    why_it_matters: Mapped[str | None] = mapped_column(Text)
    how_to_fix: Mapped[str | None] = mapped_column(Text)
    code_example_blob_path: Mapped[str | None] = mapped_column(Text)
    
    issue = relationship("ReviewIssue", back_populates="details")
