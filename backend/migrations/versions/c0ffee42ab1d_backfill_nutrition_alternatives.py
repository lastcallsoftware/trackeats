"""Backfill nutrition_alternative rows so every food has one primary serving size

This migration is DATA-ONLY (no schema removal).  It makes the
nutrition_alternative table the single source of truth for a Food's nutrition
by guaranteeing that every Food that has nutrition also has exactly one
nutrition_alternative row marked is_primary=1.

All data operations are idempotent: re-running this migration (or re-applying
it after a partial failure) does not duplicate or corrupt data.

Steps:
  1. Insert a primary nutrition_alternative for every Food that currently has
     no nutrition_alternative rows at all, pointing at the Food's nutrition_id.
  2. For Foods that already have nutrition_alternative rows but none marked
     is_primary, promote the lowest-ordinal row to primary.
  3. For Foods that (incorrectly) have more than one is_primary row, demote
     all but the lowest-id primary.
  4. Add a UNIQUE constraint (via a generated column, since MySQL has no
     partial unique indexes) that enforces at most one primary per food.

Revision ID: c0ffee42ab1d
Revises: 4e8f1a2b3c5d
Create Date: 2026-08-08 23:55:00.000000

This migration targets MySQL (per the Alembic config.ini dialect).
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c0ffee42ab1d'
down_revision = '4e8f1a2b3c5d'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # 0. Widen serving_unit so a full serving_size_description (VARCHAR(50)) can
    #    fit when we synthesize a primary alternative from it below.  The column
    #    was originally VARCHAR(30), which truncates long descriptions under
    #    MySQL strict mode -- and we must not lose data.
    conn.execute(sa.text("ALTER TABLE nutrition_alternative MODIFY serving_unit VARCHAR(50) NOT NULL"))

    # 1. Backfill a primary alternative for Foods that have NO alternatives.
    #    Guarded with NOT EXISTS so re-runs are no-ops.  serving_unit falls back
    #    to the nutrition's serving size description (or 'serving'), and
    #    serving_unit_kind defaults to 'solid' (never 'household', which would
    #    require household_weight_g).
    conn.execute(sa.text("""
        INSERT INTO nutrition_alternative
            (food_id, nutrition_id, serving_value, serving_unit,
             serving_unit_kind, household_weight_g, ordinal, is_primary)
        SELECT f.id,
               f.nutrition_id,
               1,
               COALESCE(NULLIF(n.serving_size_description, ''), 'serving'),
               'solid',
               NULL,
               0,
               1
        FROM food f
        JOIN nutrition n ON n.id = f.nutrition_id
        WHERE f.nutrition_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM nutrition_alternative na
              WHERE na.food_id = f.id
          )
    """))

    # 2. For Foods that have alternatives but none marked primary, promote the
    #    lowest-ordinal (then lowest-id) row to primary.  Only touches foods
    #    that have no is_primary=1 row, so it is safe to re-run.  Uses a window
    #    function (MySQL 8) to pick exactly one row per food deterministically.
    conn.execute(sa.text("""
        UPDATE nutrition_alternative
        SET is_primary = 1
        WHERE id IN (
            SELECT promote_id FROM (
                SELECT na.id AS promote_id,
                       ROW_NUMBER() OVER (
                           PARTITION BY na.food_id
                           ORDER BY na.ordinal ASC, na.id ASC
                       ) AS rn
                FROM nutrition_alternative na
                WHERE na.food_id IN (
                    -- foods that have >=1 alternative but no primary
                    SELECT na2.food_id
                    FROM nutrition_alternative na2
                    GROUP BY na2.food_id
                    HAVING SUM(CASE WHEN na2.is_primary = 1 THEN 1 ELSE 0 END) = 0
                )
            ) AS ranked
            WHERE ranked.rn = 1
        )
    """))

    # 3. Demote duplicate primaries: keep only the lowest-id is_primary row per
    #    food, demote the rest.  Guarded so re-runs are no-ops (after this runs,
    #    no food has more than one primary).
    conn.execute(sa.text("""
        UPDATE nutrition_alternative
        SET is_primary = 0
        WHERE is_primary = 1
          AND id NOT IN (
              SELECT id FROM (
                  SELECT MIN(na.id) AS id
                  FROM nutrition_alternative na
                  WHERE na.is_primary = 1
                  GROUP BY na.food_id
              ) AS keep
          )
    """))

    # 4. Enforce at most one primary per food.  MySQL has no partial unique
    #    indexes, so use a virtual generated column that is non-NULL only for
    #    primary rows, then a UNIQUE index on it (NULLs are not constrained).
    #    This column is DB-internal; the ORM does not map it.
    try:
        conn.execute(sa.text("""
            ALTER TABLE nutrition_alternative
                ADD COLUMN primary_food_id INT GENERATED ALWAYS AS
                    (CASE WHEN is_primary = 1 THEN food_id ELSE NULL END) VIRTUAL,
                ADD UNIQUE INDEX uq_nutrition_alternative_primary (primary_food_id)
        """))
    except Exception:
        # If the index already exists (e.g. re-applying this migration), the
        # ALTER fails harmlessly; do not mask a genuine failure of the backfill
        # itself.  We just let the data steps above, which are idempotent, stand.
        # Inspect whether the index exists; if so, skip.  Otherwise re-raise.
        insp = sa.inspect(conn)
        indexes = insp.get_indexes("nutrition_alternative")
        if not any(idx.get("name") == "uq_nutrition_alternative_primary" for idx in indexes):
            raise


def downgrade():
    conn = op.get_bind()
    # Remove the DB-internal generated column + unique index.
    insp = sa.inspect(conn)
    indexes = insp.get_indexes("nutrition_alternative")
    if any(idx.get("name") == "uq_nutrition_alternative_primary" for idx in indexes):
        conn.execute(sa.text("ALTER TABLE nutrition_alternative DROP INDEX uq_nutrition_alternative_primary"))
    columns = [c["name"] for c in insp.get_columns("nutrition_alternative")]
    if "primary_food_id" in columns:
        conn.execute(sa.text("ALTER TABLE nutrition_alternative DROP COLUMN primary_food_id"))