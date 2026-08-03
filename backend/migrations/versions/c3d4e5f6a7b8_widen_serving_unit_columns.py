"""Widen serving_unit and size_unit columns from VARCHAR(20) to VARCHAR(50)

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-07-31 02:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c3d4e5f6a7b8"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def build_truncation_statement(table_name: str, column_name: str, max_length: int = 20):
    return sa.text(
        f"""
        UPDATE {table_name}
        SET {column_name} = CASE
            WHEN CHAR_LENGTH({column_name}) > {max_length}
                THEN LEFT({column_name}, {max_length})
            ELSE {column_name}
        END
        WHERE {column_name} IS NOT NULL
          AND CHAR_LENGTH({column_name}) > {max_length}
        """
    )


def upgrade():
    with op.batch_alter_table("nutrition", schema=None) as batch_op:
        batch_op.alter_column(
            "serving_unit",
            type_=sa.String(50),
            existing_type=sa.String(20),
            nullable=True,
        )

    with op.batch_alter_table("food", schema=None) as batch_op:
        batch_op.alter_column(
            "size_unit",
            type_=sa.String(50),
            existing_type=sa.String(20),
            nullable=True,
        )

    with op.batch_alter_table("recipe", schema=None) as batch_op:
        batch_op.alter_column(
            "size_unit",
            type_=sa.String(50),
            existing_type=sa.String(20),
            nullable=True,
        )


def downgrade():
    for table_name, column_name in [
        ("nutrition", "serving_unit"),
        ("food", "size_unit"),
        ("recipe", "size_unit"),
    ]:
        op.execute(build_truncation_statement(table_name, column_name))

    with op.batch_alter_table("nutrition", schema=None) as batch_op:
        batch_op.alter_column(
            "serving_unit",
            type_=sa.String(20),
            existing_type=sa.String(50),
            nullable=True,
        )

    with op.batch_alter_table("food", schema=None) as batch_op:
        batch_op.alter_column(
            "size_unit",
            type_=sa.String(20),
            existing_type=sa.String(50),
            nullable=True,
        )

    with op.batch_alter_table("recipe", schema=None) as batch_op:
        batch_op.alter_column(
            "size_unit",
            type_=sa.String(20),
            existing_type=sa.String(50),
            nullable=True,
        )