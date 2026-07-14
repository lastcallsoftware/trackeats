"""Add starter_food and migrate central foods to catalog owner

Revision ID: f1c8c0bd21a4
Revises: c7d9e1f30a52
Create Date: 2026-07-12 00:00:00.000000

"""
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f1c8c0bd21a4"
down_revision = "c7d9e1f30a52"
branch_labels = None
depends_on = None


def _get_user_id_by_username(bind: sa.Connection, username: str) -> int | None:
    user_table = sa.table(
        "user",
        sa.column("id", sa.Integer),
        sa.column("username", sa.String),
    )
    return bind.execute(
        sa.select(user_table.c.id).where(user_table.c.username == username)
    ).scalar_one_or_none()


def upgrade():
    with op.batch_alter_table("food", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "starter_food",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            )
        )

    bind = op.get_bind()

    catalog_user_id = _get_user_id_by_username(bind, "catalog")
    if catalog_user_id is None:
        # Keep id stable when available for easier debugging and role/account conventions.
        preferred_catalog_id = 5
        id_taken = bind.execute(
            sa.text("SELECT id FROM `user` WHERE id = :id LIMIT 1"),
            {"id": preferred_catalog_id},
        ).scalar_one_or_none()

        insert_values = {
            "username": "catalog",
            "status": "confirmed",
            "created_at": datetime.now(timezone.utc).replace(tzinfo=None),
            "password_hash": None,
            "encrypted_email_addr": None,
            "email_addr_hash": None,
            "seed_requested": False,
            "seed_version": None,
            "seeded_at": None,
            "oauth_provider": None,
            "oauth_id": None,
        }

        if id_taken is None:
            insert_values["id"] = preferred_catalog_id

        bind.execute(sa.table(
            "user",
            sa.column("id", sa.Integer),
            sa.column("username", sa.String),
            sa.column("status", sa.String),
            sa.column("created_at", sa.DateTime),
            sa.column("password_hash", sa.String),
            sa.column("encrypted_email_addr", sa.LargeBinary),
            sa.column("email_addr_hash", sa.String),
            sa.column("seed_requested", sa.Boolean),
            sa.column("seed_version", sa.Integer),
            sa.column("seeded_at", sa.DateTime),
            sa.column("oauth_provider", sa.String),
            sa.column("oauth_id", sa.String),
        ).insert().values(**insert_values))

        catalog_user_id = _get_user_id_by_username(bind, "catalog")

    importer_user_id = _get_user_id_by_username(bind, "usda-importer")

    if catalog_user_id is not None and importer_user_id is not None and catalog_user_id != importer_user_id:
        bind.execute(
            sa.text(
                "UPDATE food SET user_id = :catalog_user_id WHERE user_id = :importer_user_id"
            ),
            {
                "catalog_user_id": catalog_user_id,
                "importer_user_id": importer_user_id,
            },
        )


def downgrade():
    with op.batch_alter_table("food", schema=None) as batch_op:
        batch_op.drop_column("starter_food")
