"""Add structured serving fields (value, unit, unit_kind) to nutrition, food, and recipe

Revision ID: a1b2c3d4e5f6
Revises: f1c8c0bd21a4
Create Date: 2026-07-31 01:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "f1c8c0bd21a4"
branch_labels = None
depends_on = None


def build_drop_enum_type_statement(dialect_name: str | None = None):
    if dialect_name == "mysql":
        return None
    return "DROP TYPE IF EXISTS servingunitkind"


def column_exists(bind, table_name: str, column_name: str) -> bool:
    if bind is None:
        return True

    inspector = sa.inspect(bind)
    columns = inspector.get_columns(table_name)
    return any(column["name"] == column_name for column in columns)


def upgrade():
    # Add structured serving columns to nutrition table
    with op.batch_alter_table("nutrition", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("serving_value", sa.Float(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("serving_unit", sa.String(50), nullable=True)
        )
        batch_op.add_column(
            sa.Column(
                "serving_unit_kind",
                sa.Enum("mass", "volume", "household", "unknown", name="servingunitkind"),
                nullable=True,
            )
        )

    # Add structured size columns to food table
    with op.batch_alter_table("food", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("size_value", sa.Float(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("size_unit", sa.String(50), nullable=True)
        )
        batch_op.add_column(
            sa.Column(
                "size_unit_kind",
                sa.Enum("mass", "volume", "household", "unknown", name="servingunitkind"),
                nullable=True,
            )
        )

    # Add structured size columns to recipe table
    with op.batch_alter_table("recipe", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("size_value", sa.Float(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("size_unit", sa.String(50), nullable=True)
        )
        batch_op.add_column(
            sa.Column(
                "size_unit_kind",
                sa.Enum("mass", "volume", "household", "unknown", name="servingunitkind"),
                nullable=True,
            )
        )


def downgrade():
    bind = op.get_bind()

    # Remove structured size columns from recipe table
    with op.batch_alter_table("recipe", schema=None) as batch_op:
        for column_name in ["size_unit_kind", "size_unit", "size_value"]:
            if bind is not None and not column_exists(bind, "recipe", column_name):
                continue
            batch_op.drop_column(column_name)

    # Remove structured size columns from food table
    with op.batch_alter_table("food", schema=None) as batch_op:
        for column_name in ["size_unit_kind", "size_unit", "size_value"]:
            if bind is not None and not column_exists(bind, "food", column_name):
                continue
            batch_op.drop_column(column_name)

    # Remove structured serving columns from nutrition table
    with op.batch_alter_table("nutrition", schema=None) as batch_op:
        for column_name in ["serving_unit_kind", "serving_unit", "serving_value"]:
            if bind is not None and not column_exists(bind, "nutrition", column_name):
                continue
            batch_op.drop_column(column_name)

    # Drop the enum type for dialects that support it explicitly.
    dialect_name = None
    if bind is not None:
        dialect_name = bind.dialect.name

    drop_enum_sql = build_drop_enum_type_statement(dialect_name)
    if drop_enum_sql is not None:
        op.execute(drop_enum_sql)