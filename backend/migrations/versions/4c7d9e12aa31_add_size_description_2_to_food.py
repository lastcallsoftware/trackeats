"""Add size_description_2 column to food

Revision ID: 4c7d9e12aa31
Revises: a9b15113721d
Create Date: 2026-04-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4c7d9e12aa31'
down_revision = 'a9b15113721d'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('food', schema=None) as batch_op:
        batch_op.add_column(sa.Column('size_description_2', sa.String(length=50), nullable=True))


def downgrade():
    with op.batch_alter_table('food', schema=None) as batch_op:
        batch_op.drop_column('size_description_2')
