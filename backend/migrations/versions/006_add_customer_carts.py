"""Add persistent carts for authenticated Marketplace customers."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "carts",
        sa.Column(
            "cart_id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=False),
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
        sa.ForeignKeyConstraint(["customer_id"], ["toko_jam.customers.customer_id"]),
        sa.PrimaryKeyConstraint("cart_id"),
        sa.UniqueConstraint("customer_id", name="uq_carts_customer_id"),
        schema="toko_jam",
    )
    op.create_table(
        "cart_items",
        sa.Column(
            "cart_item_id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("cart_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False),
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
        sa.CheckConstraint("qty > 0", name="cart_items_qty_positive"),
        sa.ForeignKeyConstraint(
            ["cart_id"], ["toko_jam.carts.cart_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["product_id"], ["toko_jam.products.product_id"]),
        sa.PrimaryKeyConstraint("cart_item_id"),
        sa.UniqueConstraint("cart_id", "product_id", name="uq_cart_items_product"),
        schema="toko_jam",
    )


def downgrade() -> None:
    op.drop_table("cart_items", schema="toko_jam")
    op.drop_table("carts", schema="toko_jam")
