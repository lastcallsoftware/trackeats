"""Drop food.nutrition_id now that the nutrition_alternative table is authoritative

This is the second step of the Food-nutrition cleanup.  Revision
c0ffee42ab1d backfilled a primary nutrition_alternative for every Food, so the
nutrition_alternative table is now the single source of truth for a Food's
nutrition.  This migration removes the now-redundant food.nutrition_id column
(and its foreign key).

The downgrade restores food.nutrition_id by reading the primary alternative's
nutrition_id per Food, then removes non-primary alternatives (which have no
representation in the old model).

The food table was originally created via db.create_all() rather than an
Alembic migration, so its FK on nutrition_id has an auto-generated name
(e.g. food_ibfk_1).  We introspect the real constraint name at runtime rather
than hard-coding it.

Revision ID: c0ffee42ab2d
Revises: c0ffee42ab1d
Create Date: 2026-08-08 23:59:00.000000

This migration targets MySQL (per the Alembic config.ini dialect).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine import Connection


# revision identifiers, used by Alembic.
revision = 'c0ffee42ab2d'
down_revision = 'c0ffee42ab1d'
branch_labels = None
depends_on = None


def _drop_food_nutrition_fk(conn: Connection) -> None:
    """Drop the FK from food.nutrition_id to nutrition.id, whatever its name."""
    insp = sa.inspect(conn)
    for fk in insp.get_foreign_keys("food"):
        if fk.get("referred_table") == "nutrition" and "nutrition_id" in fk.get("constrained_columns", []):
            name = fk.get("name")
            if name:
                conn.execute(sa.text(
                    f"ALTER TABLE food DROP FOREIGN KEY `{name}`"
                ))
                return
    # No matching FK found - treat as already dropped.


def upgrade():
    conn = op.get_bind()

    # 1. Drop the foreign key on food.nutrition_id (whatever its auto-generated name).
    _drop_food_nutrition_fk(conn)

    # 2. Drop the column.
    with op.batch_alter_table('food', schema=None) as batch_op:
        batch_op.drop_column('nutrition_id')


def downgrade():
    conn = op.get_bind()

    # 1. Re-add the food.nutrition_id column and FK.
    with op.batch_alter_table('food', schema=None) as batch_op:
        batch_op.add_column(sa.Column('nutrition_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_food_nutrition', 'nutrition', ['nutrition_id'], ['id']
        )

    # 2. Backfill food.nutrition_id from the primary alternative.
    conn.execute(sa.text("""
        UPDATE food f
        JOIN nutrition_alternative na
          ON na.food_id = f.id
         AND na.is_primary = 1
        SET f.nutrition_id = na.nutrition_id
    """))

    # 3. Remove non-primary alternatives - they cannot be represented in the
    #    old model (only the primary nutrition survived on food.nutrition_id).
    #    Their Nutrition records become orphans and are cleaned up separately
    #    if desired; we deliberately leave them to avoid destructive data loss
    #    in a downgrade.
    conn.execute(sa.text("DELETE FROM nutrition_alternative WHERE is_primary = 0"))