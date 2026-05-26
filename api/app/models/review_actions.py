from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ReviewAction(TimestampMixin, Base):
    __tablename__ = "review_actions"

    id: Mapped[int] = mapped_column(primary_key=True)
    review_id: Mapped[int] = mapped_column(ForeignKey("reviews.id"))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    action: Mapped[str] = mapped_column(String(64), nullable=False)
    action_metadata: Mapped[dict | None] = mapped_column(JSON)
    note: Mapped[str | None] = mapped_column(Text)

    review = relationship("Review")
    user = relationship("User")
