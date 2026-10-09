"""Add optional product brand for the public catalog."""

import sqlalchemy as sa
from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("brand", sa.String(length=120), nullable=True),
        schema="toko_jam",
    )


def downgrade() -> None:
    op.drop_column("products", "brand", schema="toko_jam")
