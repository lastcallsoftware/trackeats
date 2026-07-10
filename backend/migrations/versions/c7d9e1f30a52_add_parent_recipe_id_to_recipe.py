"""Add parent_recipe_id to recipe

Revision ID: c7d9e1f30a52
Revises: ba1ab84b3423
Create Date: 2026-07-05 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c7d9e1f30a52'
down_revision = 'ba1ab84b3423'
branch_labels = None
depends_on = None


def upgrade():
    # Self-referential link so a recipe can be a "variation" of another recipe.
    with op.batch_alter_table('recipe', schema=None) as batch_op:
        batch_op.add_column(sa.Column('parent_recipe_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_recipe_parent', 'recipe', ['parent_recipe_id'], ['id'])


def downgrade():
    with op.batch_alter_table('recipe', schema=None) as batch_op:
        batch_op.drop_constraint('fk_recipe_parent', type_='foreignkey')
        batch_op.drop_column('parent_recipe_id')
