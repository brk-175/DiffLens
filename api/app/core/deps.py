from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.users import User
from app.services.jwt import decode_access_token


oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/auth/google/callback",
    auto_error=False,
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_optional_current_user(
    token: str | None = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> User | None:
    """Return user if token is valid, else None (no exception)."""
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        return None
    return db.get(User, user_id)


def get_current_user(
    current_user: User | None = Depends(get_optional_current_user),
) -> User:
    """Strict auth dependency."""
    if current_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user
