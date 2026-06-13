import secrets
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db
from app.models.users import User
from app.schemas.auth import (
    AuthTokenResponse,
    LinkGuestReviewsRequest,
    LinkGuestReviewsResponse,
)
from app.services.auth import link_guest_reviews_to_user
from app.services.google_oidc import (
    build_google_auth_url,
    exchange_code_for_tokens,
    fetch_userinfo,
)
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
    # CSRF state check
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
        user = User(
            google_sub=google_sub,
            email=email,
            full_name=name,
            tenant_id=1,  # TODO: replace with real tenant strategy
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # keep profile reasonably fresh
        if email and user.email != email:
            user.email = email
        if name and user.full_name != name:
            user.full_name = name
        db.commit()

    # Optional guest review linking from callback query
    if guest_tokens:
        token_list = [t.strip() for t in guest_tokens.split(",")]
        link_guest_reviews_to_user(db=db, user=user, guest_tokens=token_list)

    jwt_token = create_access_token(str(user.id))
    response.delete_cookie("oidc_state")

    return AuthTokenResponse(access_token=jwt_token, token_type="Bearer")


@router.post("/link-guest-reviews", response_model=LinkGuestReviewsResponse)
def link_guest_reviews(
    payload: LinkGuestReviewsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    linked_count = link_guest_reviews_to_user(
        db=db,
        user=current_user,
        guest_tokens=payload.guest_tokens,
    )
    return LinkGuestReviewsResponse(linked_count=linked_count)
