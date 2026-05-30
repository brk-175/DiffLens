from pydantic import BaseModel


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"


class LinkGuestReviewsRequest(BaseModel):
    guest_tokens: list[str]


class LinkGuestReviewsResponse(BaseModel):
    linked_count: int
