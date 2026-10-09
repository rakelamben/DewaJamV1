"""Baseline migration for existing Supabase schema (toko_jam).

This migration is the starting point for Alembic version tracking.
The toko_jam schema already exists in Supabase — this migration
records that state without executing any DDL.

Revision ID: 001
Revises: (none)
Create Date: 2024-01-01
"""

# revision identifiers, used by Alembic.
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass  # Skema sudah ada di Supabase, tidak perlu DDL


def downgrade() -> None:
    pass  # Tidak dapat downgrade baseline
