"""Tambah tabel user_profiles di schema toko_jam.

Tabel ini memetakan UUID Supabase Auth (auth_user_id) ke entitas internal
sistem (personnel atau customer).

Revision ID: 002
Revises: 001
Create Date: 2024-01-01
Requirements: 3.5
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_profiles",
        sa.Column(
            "auth_user_id",
            UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            comment="FK ke auth.users(id) di Supabase Auth schema",
        ),
        sa.Column(
            "entity_type",
            sa.VARCHAR(),
            nullable=False,
            comment="'personnel' atau 'customer'",
        ),
        sa.Column(
            "entity_id",
            UUID(as_uuid=True),
            nullable=False,
            comment="FK ke personnel_id atau customer_id",
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "entity_type IN ('personnel', 'customer')",
            name="check_entity_type",
        ),
        sa.UniqueConstraint("entity_type", "entity_id", name="uq_entity"),
        schema="toko_jam",
    )

    op.create_index(
        "ix_user_profiles_entity",
        "user_profiles",
        ["entity_type", "entity_id"],
        schema="toko_jam",
    )


def downgrade() -> None:
    op.drop_index(
        "ix_user_profiles_entity",
        table_name="user_profiles",
        schema="toko_jam",
    )

    op.drop_table("user_profiles", schema="toko_jam")
