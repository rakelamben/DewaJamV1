"""Add marketplace addresses, stores and mock payment records."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "customer_addresses",
        sa.Column("address_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("label", sa.String(60), nullable=False, server_default="Alamat utama"),
        sa.Column("recipient_name", sa.String(150), nullable=False),
        sa.Column("recipient_phone", sa.String(50), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["toko_jam.customers.customer_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("address_id"),
        schema="toko_jam",
    )
    op.create_table(
        "stores",
        sa.Column("store_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("google_maps_url", sa.Text(), nullable=False),
        sa.Column("opening_hours", sa.String(150), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint("store_id"),
        schema="toko_jam",
    )
    op.create_table(
        "payments",
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("payment_method", sa.String(30), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("reference", sa.String(120), nullable=True),
        sa.Column("paid_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["transaction_id"], ["toko_jam.transactions.transaction_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("payment_id"),
        sa.UniqueConstraint("transaction_id", name="uq_payments_transaction_id"),
        sa.CheckConstraint("payment_method IN ('virtual_account', 'e_wallet', 'store_payment')", name="payments_method_check"),
        sa.CheckConstraint("status IN ('pending', 'paid', 'failed')", name="payments_status_check"),
        schema="toko_jam",
    )
    op.add_column("fulfillments", sa.Column("store_id", postgresql.UUID(as_uuid=True), nullable=True), schema="toko_jam")
    op.add_column("fulfillments", sa.Column("shipping_method", sa.String(length=50), nullable=True), schema="toko_jam")
    op.create_foreign_key(
        "fulfillments_store_id_fkey", "fulfillments", "stores", ["store_id"], ["store_id"], source_schema="toko_jam", referent_schema="toko_jam"
    )
    op.execute(
        """
        INSERT INTO toko_jam.stores (name, address, google_maps_url, opening_hours)
        VALUES
          ('Dewa Jam Jakarta', 'Alamat toko Jakarta akan diperbarui oleh admin', 'https://maps.google.com/?q=Dewa+Jam+Jakarta', '09.00–21.00'),
          ('Dewa Jam Bandung', 'Alamat toko Bandung akan diperbarui oleh admin', 'https://maps.google.com/?q=Dewa+Jam+Bandung', '09.00–21.00');
        """
    )


def downgrade() -> None:
    op.drop_constraint("fulfillments_store_id_fkey", "fulfillments", schema="toko_jam", type_="foreignkey")
    op.drop_column("fulfillments", "shipping_method", schema="toko_jam")
    op.drop_column("fulfillments", "store_id", schema="toko_jam")
    op.execute("DELETE FROM toko_jam.stores WHERE name IN ('Dewa Jam Jakarta', 'Dewa Jam Bandung')")
    op.drop_table("payments", schema="toko_jam")
    op.drop_table("stores", schema="toko_jam")
    op.drop_table("customer_addresses", schema="toko_jam")
