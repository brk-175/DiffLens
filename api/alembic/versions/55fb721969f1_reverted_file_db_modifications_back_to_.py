"""Reverted file db modifications back to normal state

Revision ID: 55fb721969f1
Revises: 390257624210
Create Date: 2026-06-04 06:03:41.443957

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '55fb721969f1'
down_revision: Union[str, Sequence[str], None] = '390257624210'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
