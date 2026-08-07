"""Add unit_type, density to food; rename size columns; create nutrition_alternative table

Revision ID: 4e8f1a2b3c5d
Revises: f1c8c0bd21a4
Create Date: 2026-08-03 18:25:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4e8f1a2b3c5d'
down_revision = 'f1c8c0bd21a4'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Rename size_oz → size_imperial on food table
    with op.batch_alter_table('food', schema=None) as batch_op:
        batch_op.alter_column('size_oz', new_column_name='size_imperial', existing_type=sa.Float())

    # 2. Rename size_g → size_metric on food table
    with op.batch_alter_table('food', schema=None) as batch_op:
        batch_op.alter_column('size_g', new_column_name='size_metric', existing_type=sa.Integer())

    # 3. Add unit_type ENUM column (default 'weight' for backward compat)
    with op.batch_alter_table('food', schema=None) as batch_op:
        batch_op.add_column(sa.Column(
            'unit_type',
            sa.Enum('weight', 'volume', name='unit_type_enum'),
            nullable=False,
            server_default='weight'
        ))

    # 4. Add density FLOAT column (default 1.0 for backward compat)
    with op.batch_alter_table('food', schema=None) as batch_op:
        batch_op.add_column(sa.Column(
            'density',
            sa.Float(),
            nullable=True,
            server_default='1.0'
        ))

    # 5. Create nutrition_alternative table
    #    serving_unit_kind uses solid/liquid/arbitrary (replacing mass/volume/household)
    #    is_primary marks the default serving size
    op.create_table(
        'nutrition_alternative',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('food_id', sa.Integer(), nullable=False),
        sa.Column('nutrition_id', sa.Integer(), nullable=False),
        sa.Column('serving_value', sa.Float(), nullable=False),
        sa.Column('serving_unit', sa.String(length=30), nullable=False),
        sa.Column('serving_unit_kind', sa.Enum('solid', 'liquid', 'arbitrary', name='serving_unit_kind_enum'), nullable=False),
        sa.Column('household_weight_g', sa.Float(), nullable=True),
        sa.Column('ordinal', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['food_id'], ['food.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['nutrition_id'], ['nutrition.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    # 1. Drop nutrition_alternative table
    op.drop_table('nutrition_alternative')

    # 2. Drop density column
    with op.batch_alter_table('food', schema=None) as batch_op:
        batch_op.drop_column('density')

    # 3. Drop unit_type column
    with op.batch_alter_table('food', schema=None) as batch_op:
        batch_op.drop_column('unit_type')

    # 4. Rename size_metric → size_g
    with op.batch_alter_table('food', schema=None) as batch_op:
        batch_op.alter_column('size_metric', new_column_name='size_g', existing_type=sa.Integer())

    # 5. Rename size_imperial → size_oz
    with op.batch_alter_table('food', schema=None) as batch_op:
        batch_op.alter_column('size_imperial', new_column_name='size_oz', existing_type=sa.Float())

    # Note: MySQL stores ENUM types inline on the column definition, not as separate
    # database objects, so there is nothing to drop here. (PostgreSQL would require
    # DROP TYPE, but this project targets MySQL.)
