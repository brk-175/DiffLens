import secrets
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db
from app.models.users import User
from app.schemas.auth import (
    AuthTokenResponse,
    LinkGuestReviewsRequest,
    LinkGuestReviewsResponse,
    PasswordEmailCheckRequest,
    PasswordEmailCheckResponse,
    PasswordSignInRequest,
    PasswordSignInResponse
)
from app.services.auth import link_guest_reviews_to_user
from app.services.google_oidc import (
    build_google_auth_url,
    exchange_code_for_tokens,
    fetch_userinfo,
)
from app.services.jwt import create_access_token
from app.services.password import hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

def _normalize_email(email: str) -> str:
    return email.strip().lower()

@router.get("/google/login")
def google_login():
    logger.info("google login initiated")
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
    logger.info("google callback state validated")

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
    logger.info(f"google user resolved user_id={user.id} email={user.email}")

    # Optional guest review linking from callback query
    if guest_tokens:
        token_list = [t.strip() for t in guest_tokens.split(",")]
        linked_count = link_guest_reviews_to_user(db=db, user=user, guest_tokens=token_list)
        logger.info(f"guest reviews linked user_id={user.id} linked_count={linked_count}")

    jwt_token = create_access_token(str(user.id))
    response.delete_cookie("oidc_state")
    
    logger.info(f"auth token issued user_id={user.id}")
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


@router.post("/password/check-email", response_model=PasswordEmailCheckResponse)
def check_email_for_password_flow(
    payload: PasswordEmailCheckRequest,
    db: Session = Depends(get_db),
):
    email = _normalize_email(payload.email)
    user = db.query(User).filter(User.email == email).first()

    # existing user with password -> enter password
    if user and user.password_hash:
        return PasswordEmailCheckResponse(
            email=email,
            exists=True,
            next_step="enter_password",
        )

    # existing user without password (likely Google-only) OR new user -> create password
    return PasswordEmailCheckResponse(
        email=email,
        exists=bool(user),
        next_step="create_password",
    )


@router.post("/password/signin", response_model=PasswordSignInResponse)
def password_signin(
    payload: PasswordSignInRequest,
    db: Session = Depends(get_db),
):
    email = _normalize_email(payload.email)
    password = payload.password

    user = db.query(User).filter(User.email == email).first()

    # New user -> create account with password
    if not user:
        user = User(
            email=email,
            password_hash=hash_password(password),
            tenant_id=1,  # TODO: replace with real tenant strategy
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(str(user.id))
        logger.info(f"password signup success user_id={user.id} email={email}")
        return PasswordSignInResponse(
            access_token=token,
            token_type="Bearer",
            is_new_user=True,
        )

    # Existing user with no password (Google-only or legacy) -> set password now
    if not user.password_hash:
        user.password_hash = hash_password(password)
        db.commit()

        token = create_access_token(str(user.id))
        logger.info(f"password set for existing user user_id={user.id} email={email}")
        return PasswordSignInResponse(
            access_token=token,
            token_type="Bearer",
            is_new_user=False,
        )

    # Existing user with password -> verify
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(str(user.id))
    logger.info(f"password signin success user_id={user.id} email={email}")
    return PasswordSignInResponse(
        access_token=token,
        token_type="Bearer",
        is_new_user=False,
    )
