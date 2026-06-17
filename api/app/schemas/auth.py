from pydantic import BaseModel, Field, EmailStr


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"


class LinkGuestReviewsRequest(BaseModel):
    guest_tokens: list[str]


class LinkGuestReviewsResponse(BaseModel):
    linked_count: int


class PasswordEmailCheckRequest(BaseModel):
    email: EmailStr


class PasswordEmailCheckResponse(BaseModel):
    email: EmailStr
    exists: bool
    next_step: str  # "create_password" | "enter_password"


class PasswordSignInRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class PasswordSignInResponse(AuthTokenResponse):
    is_new_user: bool
