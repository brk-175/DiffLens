import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.models.reviews import Review
from app.schemas.reviews import ReviewCreateRequest, ReviewCreateResponse, ReviewStatus


router = APIRouter(prefix="/reviews", tags=["reviews"])

@router.post("", response_model=ReviewCreateResponse)
def create_review(payload: ReviewCreateRequest, db: Session = Depends(get_db)):
    if len(payload.diff_content) > 2_000_000:
        raise HTTPException(status_code=413, detail="Diff too large")

    guest_token = secrets.token_urlsafe(16)

    review = Review(
        diff_content=payload.diff_content,
        mode_flags={mode: True for mode in payload.modes},
        status=ReviewStatus.queued,
        guest_token=guest_token,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    return ReviewCreateResponse(
        review_id=review.id,
        guest_token=guest_token,
        status=review.status,
    )
