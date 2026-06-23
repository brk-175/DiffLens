from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime


class ReviewStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    complete = "complete"
    failed = "failed"


class ReviewMode(str, Enum):
    generic = "generic"
    bug_hunter = "bug_hunter"
    security = "security"
    performance = "performance"
    maintainability = "maintainability"


class ReviewCreateRequest(BaseModel):
    diff_content: str = Field(..., min_length=1)
    modes: list[ReviewMode] = Field(default_factory=list)
    source_type: str = Field(default="pasted")  # "pasted" or "uploaded"
    file_name: str | None = None


class ReviewCreateResponse(BaseModel):
    review_id: int
    status: ReviewStatus
    input_blob_path: str


class ReviewStatusResponse(BaseModel):
    review_id: int
    status: ReviewStatus
    overall_verdict: str | None = None
    risk_level: str | None = None
    short_summary: str | None = None
    error_message: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ReviewListItem(BaseModel):
    review_id: int
    status: ReviewStatus
    overall_verdict: str | None = None
    risk_level: str | None = None
    short_summary: str | None = None
    created_at: datetime | None = None


class ReviewListResponse(BaseModel):
    items: list[ReviewListItem]
    total: int
