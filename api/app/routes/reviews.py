import hashlib
import secrets
from fastapi import APIRouter, Depends, HTTPException, Query
from rq import Queue
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.deps import get_db, get_optional_current_user
from app.models.reviews import Review, ReviewFile, ReviewIssue
from app.models.users import User
from app.schemas.reviews import ReviewCreateRequest, ReviewCreateResponse, ReviewStatus
from app.services.storage import StorageService
from app.workers.queue import get_reviews_queue
from app.workers.tasks import process_review


router = APIRouter(prefix="/reviews", tags=["reviews"])

def _assert_review_access(
    review: Review,
    guest_token: str | None,
    current_user: User | None,
) -> None:
    # Guest-owned review: guest token required
    if review.created_by is None:
        if not guest_token or review.guest_token != guest_token:
            raise HTTPException(status_code=403, detail="Access denied")
        return

    # User-owned review: logged-in owner required
    if current_user is None:
        raise HTTPException(status_code=401, detail="Authentication required!")
    if review.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied!")


@router.post("", response_model=ReviewCreateResponse)
def create_review(
    payload: ReviewCreateRequest,
    db: Session = Depends(get_db),
    reviews_queue: Queue = Depends(get_reviews_queue),
):
    if len(payload.diff_content) > 2_000_000:
        raise HTTPException(status_code=413, detail="Diff too large")

    guest_token = secrets.token_urlsafe(16)

    # Stable hash for pasted naming
    diff_hash = hashlib.sha256(payload.diff_content.encode("utf-8")).hexdigest()[:12]

    if payload.source_type == "uploaded":
        if not payload.file_name:
            raise HTTPException(status_code=400, detail="file_name required for uploads")
        file_display_name = payload.file_name
    elif payload.source_type == "pasted":
        file_display_name = f"pasted_{diff_hash}.diff"
    else:
        raise HTTPException(status_code=400, detail="source_type must be 'pasted' or 'uploaded'")

    review = Review(
        status=ReviewStatus.queued.value,
        mode_flags={mode.value if hasattr(mode, "value") else str(mode): True for mode in payload.modes},
        guest_token=guest_token,
        storage_provider=settings.STORAGE_PROVIDER,
        storage_bucket=settings.MINIO_BUCKET,
    )
    db.add(review)
    db.flush()

    # Upload diff to MinIO
    storage = StorageService()
    input_path = f"reviews/{review.id}/input/{file_display_name}"
    blob_path, blob_size, blob_hash = storage.upload_text(input_path, payload.diff_content)

    review.input_blob_path = blob_path
    review.input_blob_size = blob_size
    review.input_blob_hash = blob_hash

    review_file = ReviewFile(
        review_id=review.id,
        file_path=file_display_name,
        source_type=payload.source_type,
    )
    db.add(review_file)
    db.commit()
    db.refresh(review)

    # Enqueue background job
    reviews_queue.enqueue(process_review, review.id)

    return ReviewCreateResponse(
        review_id=review.id,
        guest_token=guest_token,
        status=ReviewStatus(review.status),
        input_blob_path=blob_path,
    )


@router.get("/{review_id}/result")
def get_review_result(
    review_id: int,
    guest_token: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    _assert_review_access(review, guest_token, current_user)

    if review.status != ReviewStatus.complete.value:
        raise HTTPException(status_code=409, detail=f"Review not ready. Current status: {review.status}")

    if not review.output_blob_path:
        raise HTTPException(status_code=404, detail="Output blob path missing")

    storage = StorageService()
    payload = storage.download_json(review.output_blob_path)
    if payload is None:
        raise HTTPException(status_code=404, detail="Review result not found in storage")

    return payload


@router.get("/issues/{issue_id}/details")
def get_issue_details(
    issue_id: int,
    guest_token: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    issue = db.get(ReviewIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    review_file = issue.review_file
    if not review_file or not review_file.review:
        raise HTTPException(status_code=404, detail="Parent review not found")

    review = review_file.review
    _assert_review_access(review, guest_token, current_user)

    details = issue.details
    storage = StorageService()

    suggested_fix = None
    if issue.suggested_fix_blob_path:
        suggested_fix = storage.download_text(issue.suggested_fix_blob_path)

    code_example = None
    if details and details.code_example_blob_path:
        code_example = storage.download_text(details.code_example_blob_path)

    return {
        "issue_id": issue.id,
        "severity": issue.severity,
        "comment": issue.comment,
        "line_start": issue.line_start,
        "line_end": issue.line_end,
        "why_this_matters": {
            "what_is_wrong": details.what_is_wrong if details else None,
            "why_it_matters": details.why_it_matters if details else None,
            "how_to_fix": details.how_to_fix if details else None,
            "code_example": code_example,
        },
        "suggested_fix": suggested_fix,
    }
