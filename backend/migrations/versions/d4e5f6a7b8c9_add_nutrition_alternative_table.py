"""Add nutrition_alternative junction table

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-07-31 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d4e5f6a7b8c9"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "nutrition_alternative",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("food_id", sa.Integer(), sa.ForeignKey("food.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nutrition_id", sa.Integer(), sa.ForeignKey("nutrition.id", ondelete="CASCADE"), nullable=False),
        sa.Column("serving_value", sa.Float(), nullable=False),
        sa.Column("serving_unit", sa.String(50), nullable=False),
        sa.Column(
            "serving_unit_kind",
            sa.Enum("mass", "volume", "household", "unknown", name="servingunitkind"),
            nullable=False,
        ),
        sa.Column("ordinal", sa.Integer(), nullable=False, default=0),
    )


def downgrade():
    op.drop_table("nutrition_alternative")