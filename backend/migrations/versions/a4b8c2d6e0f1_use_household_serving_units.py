"""Use household as the non-mass serving-unit kind.

Revision ID: a4b8c2d6e0f1
Revises: 9f2a7c6d1e4b
Create Date: 2026-08-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "a4b8c2d6e0f1"
down_revision = "9f2a7c6d1e4b"
branch_labels = None
depends_on = None


def upgrade():
    # Widen the enum first so existing 'arbitrary' rows aren't truncated
    # while they're renamed, then narrow it once the data is converted.
    op.execute(
        sa.text(
            "ALTER TABLE nutrition_alternative "
            "MODIFY COLUMN serving_unit_kind "
            "ENUM('solid', 'liquid', 'arbitrary', 'household') NOT NULL"
        )
    )
    op.execute(
        sa.text(
            "UPDATE nutrition_alternative "
            "SET serving_unit_kind = 'household' "
            "WHERE serving_unit_kind = 'arbitrary'"
        )
    )
    op.execute(
        sa.text(
            "ALTER TABLE nutrition_alternative "
            "MODIFY COLUMN serving_unit_kind "
            "ENUM('solid', 'liquid', 'household') NOT NULL"
        )
    )


def downgrade():
    raise RuntimeError("The serving-unit terminology migration is forward-only.")
