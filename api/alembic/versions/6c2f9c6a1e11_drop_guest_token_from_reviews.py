"""drop guest_token from reviews

Revision ID: 6c2f9c6a1e11
Revises: 2674193591e8
Create Date: 2026-06-23 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6c2f9c6a1e11"
down_revision: Union[str, Sequence[str], None] = "2674193591e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE reviews DROP COLUMN IF EXISTS guest_token")


def downgrade() -> None:
    op.add_column("reviews", sa.Column("guest_token", sa.String(length=64), nullable=True))
    op.create_unique_constraint("uq_reviews_guest_token", "reviews", ["guest_token"])
