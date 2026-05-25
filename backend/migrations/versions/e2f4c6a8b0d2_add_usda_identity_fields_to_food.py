"""Add USDA import identity fields to food

Revision ID: e2f4c6a8b0d2
Revises: d1a2b3c4d5e6
Create Date: 2026-05-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e2f4c6a8b0d2"
down_revision = "d1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("food", schema=None) as batch_op:
        batch_op.add_column(sa.Column("source", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("fdc_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("fdc_data_type", sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column("last_synced_at", sa.DateTime(), nullable=True))
        batch_op.create_index("ix_food_source_fdc_id", ["source", "fdc_id"], unique=True)


def downgrade():
    with op.batch_alter_table("food", schema=None) as batch_op:
        batch_op.drop_index("ix_food_source_fdc_id")
        batch_op.drop_column("last_synced_at")
        batch_op.drop_column("fdc_data_type")
        batch_op.drop_column("fdc_id")
        batch_op.drop_column("source")
