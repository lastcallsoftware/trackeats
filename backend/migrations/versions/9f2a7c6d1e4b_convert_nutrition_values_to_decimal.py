"""Convert Nutrition numeric values to DECIMAL(7,2).

Revision ID: 9f2a7c6d1e4b
Revises: f1c8c0bd21a4
Create Date: 2026-08-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9f2a7c6d1e4b"
down_revision = ("f1c8c0bd21a4", "c0ffee42ab2d")
branch_labels = None
depends_on = None


NUMERIC_FIELDS = (
    "serving_size_g",
    "serving_size_oz",
    "calories",
    "total_fat_g",
    "saturated_fat_g",
    "trans_fat_g",
    "cholesterol_mg",
    "sodium_mg",
    "total_carbs_g",
    "fiber_g",
    "total_sugar_g",
    "added_sugar_g",
    "protein_g",
    "vitamin_d_mcg",
    "calcium_mg",
    "iron_mg",
    "potassium_mg",
)


def upgrade():
    with op.batch_alter_table("nutrition", schema=None) as batch_op:
        for field in NUMERIC_FIELDS:
            batch_op.alter_column(
                field,
                existing_type=sa.Float() if field in {"serving_size_oz", "total_fat_g", "saturated_fat_g", "trans_fat_g", "iron_mg"} else sa.Integer(),
                type_=sa.Numeric(precision=7, scale=2),
            )


def downgrade():
    with op.batch_alter_table("nutrition", schema=None) as batch_op:
        for field in NUMERIC_FIELDS:
            if field == "serving_size_g" or field in {
                "calories",
                "cholesterol_mg",
                "sodium_mg",
                "total_carbs_g",
                "fiber_g",
                "total_sugar_g",
                "added_sugar_g",
                "protein_g",
                "vitamin_d_mcg",
                "calcium_mg",
                "potassium_mg",
            }:
                original_type = sa.Integer()
            else:
                original_type = sa.Float()
            batch_op.alter_column(
                field,
                existing_type=sa.Numeric(precision=7, scale=2),
                type_=original_type,
            )
