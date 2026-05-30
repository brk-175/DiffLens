import secrets
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.core.config import settings
from app.models.users import User
from app.models.reviews import Review
from app.schemas.auth import AuthTokenResponse, LinkGuestReviewsRequest, LinkGuestReviewsResponse
from app.services.google_oidc import build_google_auth_url, exchange_code_for_tokens, fetch_userinfo
from app.services.jwt import create_access_token


router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/google/login")
def google_login():
    state = secrets.token_urlsafe(16)
    url = build_google_auth_url(state)
    response = RedirectResponse(url)
    response.set_cookie(
        "oidc_state",
        state,
        httponly=True,
        max_age=300,
        samesite="lax",
    )
    return response


@router.get("/google/callback")
async def google_callback(
    request: Request,
    response: Response,
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
    guest_tokens: str | None = Query(None),
):
    cookie_state = request.cookies.get("oidc_state")
    if not cookie_state or cookie_state != state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    
    tokens = await exchange_code_for_tokens(code)
    userinfo = await fetch_userinfo(tokens["access_token"])

    google_sub = userinfo.get("sub")
    email = userinfo.get("email")
    name = userinfo.get("name")

    if not google_sub:
        raise HTTPException(status_code=400, detail="Google user info missing sub")

    user = db.query(User).filter(User.google_sub == google_sub).first()
    if not user:
        user = User(google_sub=google_sub, email=email, full_name=name, tenant_id=1)
        db.add(user)
        db.commit()
        db.refresh(user)

    # Optional guest review linking
    if guest_tokens:
        token_list = [t.strip() for t in guest_tokens.split(",") if t.strip()]
        if token_list:
            (
                db.query(Review)
                .filter(Review.guest_token.in_(token_list), Review.created_by.is_(None))
                .update({Review.created_by: user.id}, synchronize_session=False)
            )
            db.commit()

    jwt_token = create_access_token(str(user.id))
    response.delete_cookie("oidc_state")
    return AuthTokenResponse(access_token=jwt_token)


@router.post("/link-guest-reviews", response_model=LinkGuestReviewsResponse)
def link_guest_reviews(
    payload: LinkGuestReviewsRequest,
    db: Session = Depends(get_db),
):
    if not payload.guest_tokens:
        return LinkGuestReviewsResponse(linked_count=0)

    # NOTE: Replace with actual current user once JWT auth is in place.
    # For now, just raise.
    raise HTTPException(status_code=501, detail="Auth not wired yet")
