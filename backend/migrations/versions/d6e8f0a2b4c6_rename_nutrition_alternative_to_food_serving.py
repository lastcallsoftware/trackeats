"""Rename nutrition_alternative to food_serving, preserving existing records.

Revision ID: d6e8f0a2b4c6
Revises: 4162452711e6
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "d6e8f0a2b4c6"
down_revision = "4162452711e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.rename_table("nutrition_alternative", "food_serving")


def downgrade() -> None:
    op.rename_table("food_serving", "nutrition_alternative")
