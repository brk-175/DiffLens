from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.reviews import Review
from app.models.users import User


def link_guest_reviews_to_user(
    db: Session,
    user: User,
    guest_tokens: list[str] | None,
) -> int:
    """
    Link unowned guest reviews to the logged-in user.
    Returns number of linked reviews.
    """
    if not guest_tokens:
        return 0

    # sanitize + dedupe + guard
    token_list = [t.strip() for t in guest_tokens if t and t.strip()]
    token_list = list(dict.fromkeys(token_list))

    if not token_list:
        return 0
    if len(token_list) > 100:
        raise HTTPException(status_code=400, detail="Too many guest tokens")

    reviews = (
        db.query(Review)
        .filter(
            Review.guest_token.in_(token_list),
            Review.created_by.is_(None),
        )
        .all()
    )

    for review in reviews:
        review.created_by = user.id
        if review.tenant_id is None and user.tenant_id is not None:
            review.tenant_id = user.tenant_id

    db.commit()
    return len(reviews)
