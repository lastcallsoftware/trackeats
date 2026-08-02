"""Widen serving_unit and size_unit columns from VARCHAR(20) to VARCHAR(50)

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-07-31 02:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c3d4e5f6a7b8"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("nutrition", schema=None) as batch_op:
        batch_op.alter_column(
            "serving_unit",
            type_=sa.String(50),
            existing_type=sa.String(20),
            nullable=True,
        )

    with op.batch_alter_table("food", schema=None) as batch_op:
        batch_op.alter_column(
            "size_unit",
            type_=sa.String(50),
            existing_type=sa.String(20),
            nullable=True,
        )

    with op.batch_alter_table("recipe", schema=None) as batch_op:
        batch_op.alter_column(
            "size_unit",
            type_=sa.String(50),
            existing_type=sa.String(20),
            nullable=True,
        )


def downgrade():
    with op.batch_alter_table("nutrition", schema=None) as batch_op:
        batch_op.alter_column(
            "serving_unit",
            type_=sa.String(20),
            existing_type=sa.String(50),
            nullable=True,
        )

    with op.batch_alter_table("food", schema=None) as batch_op:
        batch_op.alter_column(
            "size_unit",
            type_=sa.String(20),
            existing_type=sa.String(50),
            nullable=True,
        )

    with op.batch_alter_table("recipe", schema=None) as batch_op:
        batch_op.alter_column(
            "size_unit",
            type_=sa.String(20),
            existing_type=sa.String(50),
            nullable=True,
        )