from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.reviews import Review


def process_review(review_id: int) -> None:
    db: Session = SessionLocal()
    try:
        review = db.query(Review).get(review_id)
        if not review:
            return
        review.status = "processing"
        db.commit()

        # TODO: fetch diff from MinIO, call AI, store output
        review.status = "complete"
        db.commit()
    finally:
        db.close()
