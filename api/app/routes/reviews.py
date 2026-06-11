import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.models.reviews import Review, ReviewFile
from app.schemas.reviews import ReviewCreateRequest, ReviewCreateResponse, ReviewStatus
import hashlib
from app.services.storage import StorageService
from app.core.config import settings
from app.workers.queue import get_reviews_queue
from app.workers.tasks import process_review
from rq import Queue

router = APIRouter(prefix="/reviews", tags=["reviews"])

@router.post("", response_model=ReviewCreateResponse)
def create_review(payload: ReviewCreateRequest, db: Session = Depends(get_db), reviews_queue: Queue = Depends(get_reviews_queue)):
    if len(payload.diff_content) > 2_000_000:
        raise HTTPException(status_code=413, detail="Diff too large")

    guest_token = secrets.token_urlsafe(16)

    # Generate stable hash for naming
    diff_hash = hashlib.sha256(payload.diff_content.encode("utf-8")).hexdigest()[:12]

    if payload.source_type == "uploaded":
        if not payload.file_name:
            raise HTTPException(status_code=400, detail="file_name required for uploads")
        file_display_name = payload.file_name
    else:
        file_display_name = f"pasted_{diff_hash}.diff"

    review = Review(
        status=ReviewStatus.queued.value,
        mode_flags={mode: True for mode in payload.modes},
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

    db.query(Review).filter(Review.id == review.id).update({ 
        Review.input_blob_path: blob_path, 
        Review.input_blob_size: blob_size, 
        Review.input_blob_hash: blob_hash 
    })

    review_file = ReviewFile(
        review_id=review.id,
        file_path=file_display_name,
        source_type=payload.source_type,
    )
    db.add(review_file)
    db.commit()
    db.refresh(review)

    # Enqueue background job to process the posted review
    reviews_queue.enqueue(process_review, review.id)

    return ReviewCreateResponse(
        review_id=review.id,
        guest_token=guest_token,
        status=review.status,
        input_blob_path=blob_path,
    )
