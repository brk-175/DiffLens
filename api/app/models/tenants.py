from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Tenant(TimestampMixin, Base):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    users = relationship("User", back_populates="tenant")
    reviews = relationship("Review", back_populates="tenant")
