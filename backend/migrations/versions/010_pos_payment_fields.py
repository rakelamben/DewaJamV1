"""Add payment totals required by the personnel POS."""

import sqlalchemy as sa
from alembic import op

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("paid_amount", sa.Numeric(12, 2), nullable=True), schema="toko_jam")
    op.add_column("transactions", sa.Column("change_amount", sa.Numeric(12, 2), nullable=True), schema="toko_jam")


def downgrade() -> None:
    op.drop_column("transactions", "change_amount", schema="toko_jam")
    op.drop_column("transactions", "paid_amount", schema="toko_jam")
