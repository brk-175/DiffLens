"""add file_code_blob_path to review_files

Revision ID: 9f4e6d21ac13
Revises: 6c2f9c6a1e11
Create Date: 2026-06-23 12:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f4e6d21ac13"
down_revision: Union[str, Sequence[str], None] = "6c2f9c6a1e11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("review_files", sa.Column("file_code_blob_path", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("review_files", "file_code_blob_path")
