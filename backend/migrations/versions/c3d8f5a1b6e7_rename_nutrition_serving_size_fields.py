"""Rename nutrition serving_size_g/oz to serving_size_metric/imperial.

Revision ID: c3d8f5a1b6e7
Revises: b7e1f4a9c2d3
Create Date: 2026-08-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "c3d8f5a1b6e7"
down_revision = "b7e1f4a9c2d3"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("nutrition", schema=None) as batch_op:
        batch_op.alter_column("serving_size_g", new_column_name="serving_size_metric", existing_type=sa.Numeric(7, 2))
        batch_op.alter_column("serving_size_oz", new_column_name="serving_size_imperial", existing_type=sa.Numeric(7, 2))


def downgrade():
    with op.batch_alter_table("nutrition", schema=None) as batch_op:
        batch_op.alter_column("serving_size_metric", new_column_name="serving_size_g", existing_type=sa.Numeric(7, 2))
        batch_op.alter_column("serving_size_imperial", new_column_name="serving_size_oz", existing_type=sa.Numeric(7, 2))
