"""Prevent duplicate source food identities for the same owner.

Revision ID: e7f9a1b3c5d7
Revises: d6e8f0a2b4c6
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e7f9a1b3c5d7"
down_revision = "d6e8f0a2b4c6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    duplicate = op.get_bind().execute(sa.text(
        "SELECT user_id, source, fdc_id FROM food "
        "WHERE source IS NOT NULL AND fdc_id IS NOT NULL "
        "GROUP BY user_id, source, fdc_id HAVING COUNT(*) > 1 LIMIT 1"
    )).first()
    if duplicate is not None:
        raise RuntimeError(
            "Duplicate imported foods exist for "
            f"user_id={duplicate[0]}, source={duplicate[1]}, fdc_id={duplicate[2]}. "
            "Resolve duplicates before retrying this migration; no records were deleted."
        )
    with op.batch_alter_table("food") as batch_op:
        batch_op.create_unique_constraint("uq_food_user_source_fdc", ["user_id", "source", "fdc_id"])


def downgrade() -> None:
    with op.batch_alter_table("food") as batch_op:
        batch_op.drop_constraint("uq_food_user_source_fdc", type_="unique")
