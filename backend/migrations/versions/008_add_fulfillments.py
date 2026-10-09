"""Add delivery and pickup tracking records."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fulfillments",
        sa.Column(
            "fulfillment_id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("method", sa.String(length=20), nullable=False),
        sa.Column(
            "status", sa.String(length=30), nullable=False, server_default="pending"
        ),
        sa.Column("recipient_name", sa.String(length=150), nullable=True),
        sa.Column("recipient_phone", sa.String(length=50), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("distance_km", sa.Numeric(10, 2), nullable=True),
        sa.Column("rate_per_km", sa.Numeric(12, 2), nullable=True),
        sa.Column(
            "shipping_fee", sa.Numeric(12, 2), nullable=False, server_default="0"
        ),
        sa.Column("tracking_number", sa.String(length=120), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["transaction_id"],
            ["toko_jam.transactions.transaction_id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("fulfillment_id"),
        sa.UniqueConstraint("transaction_id", name="uq_fulfillments_transaction_id"),
        sa.CheckConstraint(
            "method IN ('delivery', 'pickup')", name="fulfillments_method_check"
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'ready', 'picked_up', 'shipped', 'delivered')",
            name="fulfillments_status_check",
        ),
        schema="toko_jam",
    )


def downgrade() -> None:
    op.drop_table("fulfillments", schema="toko_jam")
