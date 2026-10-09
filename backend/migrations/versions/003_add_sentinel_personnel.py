"""Tambah sentinel personnel untuk audit log customer.

Sentinel UUID digunakan sebagai personnel_id pada activity_logs ketika aksi
dilakukan oleh customer mandiri (seperti registrasi customer).

Revision ID: 003
Revises: 002
Create Date: 2024-01-02
Requirements: 2.6
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None

SENTINEL_ID = "00000000-0000-0000-0000-000000000001"


def upgrade() -> None:
    op.execute(
        f"""
        INSERT INTO toko_jam.personnel (personnel_id, personnel_type)
        VALUES ('{SENTINEL_ID}', 'admin')
        ON CONFLICT (personnel_id) DO NOTHING;
        """
    )


def downgrade() -> None:
    op.execute(
        f"""
        DELETE FROM toko_jam.personnel
        WHERE personnel_id = '{SENTINEL_ID}';
        """
    )
