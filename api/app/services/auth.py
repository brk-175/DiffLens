from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core.deps import get_db, get_optional_current_user
from app.models.users import User
from app.schemas.auth import LinkGuestReviewsRequest, LinkGuestReviewsResponse
from app.models.reviews import Review


def link_guest_reviews(payload: LinkGuestReviewsRequest, user: User):
    db = SessionLocal()
    try:
        if not payload.guest_tokens:
            return LinkGuestReviewsResponse(linked_count=0)

        token_list = [t.strip() for t in payload.guest_tokens.split(",") if t.strip()]
        if token_list:
            linked_count = db.query(Review).filter(Review.guest_token.in_(token_list), Review.created_by.is_(None)).update({Review.created_by: user.id}, synchronize_session=False)
            db.commit()
            return LinkGuestReviewsResponse(linked_count=linked_count)

    except Exception as e:
        db.rollback()
        raise ValueError(status_code=500, detail=f"Error linking guest reviews: {e}")

    finally:
        db.close()
