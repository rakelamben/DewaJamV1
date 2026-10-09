"""Update tabel products di schema toko_jam: tambah gambar_url, tags, dan perbarui kategori.

Revision ID: 004
Revises: 003
Create Date: 2024-01-03
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None

NEW_CATEGORIES = (
    "'Jam Tangan Pria', 'Jam Tangan Wanita', 'Jam Tangan Anak-anak', "
    "'Smartwatch', 'Jam Tangan Luxury', 'Strap & Aksesoris'"
)

OLD_CATEGORIES = (
    "'Jam Tangan', 'Jam Dinding', 'Jam Meja', 'Jam Alarm', 'Aksesoris'"
)


def upgrade() -> None:
    # 1. Tambah kolom gambar_url (text, nullable)
    op.add_column(
        "products",
        sa.Column("gambar_url", sa.Text(), nullable=True),
        schema="toko_jam",
    )

    # 2. Tambah kolom tags (array of string, default '{}')
    op.add_column(
        "products",
        sa.Column(
            "tags",
            postgresql.ARRAY(sa.String()),
            nullable=False,
            server_default=sa.text("'{}'::text[]"),
        ),
        schema="toko_jam",
    )

    # 3. Hapus CHECK constraint lama TERLEBIH DAHULU (jika ada)
    #    agar UPDATE data di bawah tidak terblokir oleh constraint apapun
    op.execute(
        "ALTER TABLE toko_jam.products DROP CONSTRAINT IF EXISTS products_kategori_check"
    )

    # 4. Migrasikan data: petakan kategori lama → kategori baru
    op.execute(
        "UPDATE toko_jam.products SET kategori = 'Jam Tangan Pria' "
        "WHERE kategori = 'Jam Tangan'"
    )
    op.execute(
        "UPDATE toko_jam.products SET kategori = 'Strap & Aksesoris' "
        "WHERE kategori = 'Aksesoris'"
    )
    # Fallback: kategori lain yang tidak terpetakan (Jam Dinding, Jam Meja, Jam Alarm)
    op.execute(
        f"""
        UPDATE toko_jam.products SET kategori = 'Jam Tangan Pria'
        WHERE kategori NOT IN ({NEW_CATEGORIES})
        """
    )

    # 5. Pasang CHECK constraint baru dengan 6 kategori resmi
    op.execute(
        f"""
        ALTER TABLE toko_jam.products
        ADD CONSTRAINT products_kategori_check
        CHECK (kategori IN ({NEW_CATEGORIES}))
        """
    )


def downgrade() -> None:
    # 1. Kembalikan constraint kategori ke kategori lama
    op.execute(
        f"""
        DO $$
        BEGIN
            ALTER TABLE toko_jam.products 
            DROP CONSTRAINT IF EXISTS products_kategori_check;

            ALTER TABLE toko_jam.products 
            ADD CONSTRAINT products_kategori_check 
            CHECK (kategori IN ({OLD_CATEGORIES}));
        END $$;
        """
    )

    # 2. Hapus kolom tags
    op.drop_column("products", "tags", schema="toko_jam")

    # 3. Hapus kolom gambar_url
    op.drop_column("products", "gambar_url", schema="toko_jam")
