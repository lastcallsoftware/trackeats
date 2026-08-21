"""Drop household_weight_g; household units now use solid/liquid like everything else.

Revision ID: b7e1f4a9c2d3
Revises: a4b8c2d6e0f1
Create Date: 2026-08-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "b7e1f4a9c2d3"
down_revision = "a4b8c2d6e0f1"
branch_labels = None
depends_on = None


def upgrade():
    # Household rows always had a directly-entered weight, matching "solid".
    op.execute(
        sa.text(
            "ALTER TABLE nutrition_alternative "
            "MODIFY COLUMN serving_unit_kind "
            "ENUM('solid', 'liquid', 'household') NOT NULL"
        )
    )
    op.execute(
        sa.text(
            "UPDATE nutrition_alternative "
            "SET serving_unit_kind = 'solid' "
            "WHERE serving_unit_kind = 'household'"
        )
    )
    op.execute(
        sa.text(
            "ALTER TABLE nutrition_alternative "
            "MODIFY COLUMN serving_unit_kind "
            "ENUM('solid', 'liquid') NOT NULL"
        )
    )
    with op.batch_alter_table("nutrition_alternative", schema=None) as batch_op:
        batch_op.drop_column("household_weight_g")


def downgrade():
    with op.batch_alter_table("nutrition_alternative", schema=None) as batch_op:
        batch_op.add_column(sa.Column("household_weight_g", sa.Float(), nullable=True))
    op.execute(
        sa.text(
            "ALTER TABLE nutrition_alternative "
            "MODIFY COLUMN serving_unit_kind "
            "ENUM('solid', 'liquid', 'household') NOT NULL"
        )
    )
