"""Add channel, payment, order and fulfillment fields to transactions."""

import sqlalchemy as sa
from alembic import op

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column(
            "channel", sa.String(length=20), nullable=False, server_default="pos"
        ),
        schema="toko_jam",
    )
    op.add_column(
        "transactions",
        sa.Column(
            "order_status",
            sa.String(length=30),
            nullable=False,
            server_default="pending",
        ),
        schema="toko_jam",
    )
    op.add_column(
        "transactions",
        sa.Column(
            "payment_status",
            sa.String(length=30),
            nullable=False,
            server_default="unpaid",
        ),
        schema="toko_jam",
    )
    op.add_column(
        "transactions",
        sa.Column("payment_method", sa.String(length=50), nullable=True),
        schema="toko_jam",
    )
    op.add_column(
        "transactions",
        sa.Column("fulfillment_method", sa.String(length=20), nullable=True),
        schema="toko_jam",
    )
    op.add_column(
        "transactions",
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        schema="toko_jam",
    )
    op.add_column(
        "transactions",
        sa.Column(
            "shipping_fee", sa.Numeric(12, 2), nullable=False, server_default="0"
        ),
        schema="toko_jam",
    )
    op.create_check_constraint(
        "transactions_channel_check",
        "transactions",
        "channel IN ('pos', 'marketplace', 'inplace')",
        schema="toko_jam",
    )
    op.create_check_constraint(
        "transactions_order_status_check",
        "transactions",
        "order_status IN ('pending', 'paid', 'processing', 'completed', 'cancelled')",
        schema="toko_jam",
    )
    op.create_check_constraint(
        "transactions_payment_status_check",
        "transactions",
        "payment_status IN ('unpaid', 'paid', 'failed')",
        schema="toko_jam",
    )
    op.create_check_constraint(
        "transactions_fulfillment_method_check",
        "transactions",
        "fulfillment_method IS NULL OR fulfillment_method IN ('delivery', 'pickup')",
        schema="toko_jam",
    )


def downgrade() -> None:
    for constraint in (
        "transactions_fulfillment_method_check",
        "transactions_payment_status_check",
        "transactions_order_status_check",
        "transactions_channel_check",
    ):
        op.drop_constraint(constraint, "transactions", schema="toko_jam", type_="check")
    for column in (
        "shipping_fee",
        "subtotal",
        "fulfillment_method",
        "payment_method",
        "payment_status",
        "order_status",
        "channel",
    ):
        op.drop_column("transactions", column, schema="toko_jam")
