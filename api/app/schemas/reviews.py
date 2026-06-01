from enum import Enum
from pydantic import BaseModel, Field


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


class ReviewCreateResponse(BaseModel):
    review_id: int
    guest_token: str
    status: ReviewStatus
