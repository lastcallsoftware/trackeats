"""Add oauth_provider and oauth_id columns to user

Revision ID: d1a2b3c4d5e6
Revises: 4c7d9e12aa31
Create Date: 2026-04-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd1a2b3c4d5e6'
down_revision = '81ad6a7b73bf'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('oauth_provider', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('oauth_id', sa.String(length=128), nullable=True))
        batch_op.create_index('ix_user_oauth', ['oauth_provider', 'oauth_id'], unique=True)

    # Make password_hash nullable for social-only accounts
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.alter_column('password_hash', existing_type=sa.String(length=64), nullable=True)


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_index('ix_user_oauth')
        batch_op.drop_column('oauth_id')
        batch_op.drop_column('oauth_provider')
        batch_op.alter_column('password_hash', existing_type=sa.String(length=64), nullable=False)
