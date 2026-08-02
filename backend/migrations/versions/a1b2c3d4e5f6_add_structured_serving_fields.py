"""Add structured serving fields (value, unit, unit_kind) to nutrition, food, and recipe

Revision ID: a1b2c3d4e5f6
Revises: f1c8c0bd21a4
Create Date: 2026-07-31 01:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "f1c8c0bd21a4"
branch_labels = None
depends_on = None


def upgrade():
    # Add structured serving columns to nutrition table
    with op.batch_alter_table("nutrition", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("serving_value", sa.Float(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("serving_unit", sa.String(50), nullable=True)
        )
        batch_op.add_column(
            sa.Column(
                "serving_unit_kind",
                sa.Enum("mass", "volume", "household", "unknown", name="servingunitkind"),
                nullable=True,
            )
        )

    # Add structured size columns to food table
    with op.batch_alter_table("food", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("size_value", sa.Float(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("size_unit", sa.String(50), nullable=True)
        )
        batch_op.add_column(
            sa.Column(
                "size_unit_kind",
                sa.Enum("mass", "volume", "household", "unknown", name="servingunitkind"),
                nullable=True,
            )
        )

    # Add structured size columns to recipe table
    with op.batch_alter_table("recipe", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("size_value", sa.Float(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("size_unit", sa.String(50), nullable=True)
        )
        batch_op.add_column(
            sa.Column(
                "size_unit_kind",
                sa.Enum("mass", "volume", "household", "unknown", name="servingunitkind"),
                nullable=True,
            )
        )


def downgrade():
    # Remove structured size columns from recipe table
    with op.batch_alter_table("recipe", schema=None) as batch_op:
        batch_op.drop_column("size_unit_kind")
        batch_op.drop_column("size_unit")
        batch_op.drop_column("size_value")

    # Remove structured size columns from food table
    with op.batch_alter_table("food", schema=None) as batch_op:
        batch_op.drop_column("size_unit_kind")
        batch_op.drop_column("size_unit")
        batch_op.drop_column("size_value")

    # Remove structured serving columns from nutrition table
    with op.batch_alter_table("nutrition", schema=None) as batch_op:
        batch_op.drop_column("serving_unit_kind")
        batch_op.drop_column("serving_unit")
        batch_op.drop_column("serving_value")

    # Drop the enum type
    op.execute("DROP TYPE IF EXISTS servingunitkind")