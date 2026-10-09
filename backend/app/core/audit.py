"""Audit log terpusat untuk sistem Dewa Jam.

Modul ini menyediakan model SQLAlchemy `ActivityLog` yang memetakan ke tabel
`toko_jam.activity_logs` serta fungsi `write_audit_log` yang dapat dipanggil
dari semua module untuk mencatat setiap perubahan data.
"""

import uuid

from sqlalchemy import DateTime, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, Session, mapped_column

from .database import Base


class ActivityLog(Base):
    """Model SQLAlchemy untuk tabel `toko_jam.activity_logs`.

    Merepresentasikan satu baris audit log yang merekam siapa melakukan
    aksi apa pada tabel dan record mana.
    """

    __tablename__ = "activity_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    personnel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("toko_jam.personnel.personnel_id"),
        nullable=False,
    )
    action: Mapped[str] = mapped_column(String, nullable=False)
    table_name: Mapped[str] = mapped_column(String, nullable=False)
    record_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    detail: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )


_VALID_ACTIONS = frozenset({"create", "update", "delete"})


def write_audit_log(
    session: Session,
    personnel_id: uuid.UUID,
    action: str,
    table_name: str,
    record_id: uuid.UUID | None = None,
    detail: dict | None = None,
) -> None:
    """Menulis satu baris audit log ke tabel ``toko_jam.activity_logs``.

    Fungsi ini hanya melakukan ``session.add()`` — **tidak** memanggil
    ``session.commit()``. Caller bertanggung jawab untuk meng-commit atau
    me-rollback transaksi sehingga log dan perubahan data utama selalu
    berada dalam satu transaksi atomik.

    Args:
        session: SQLAlchemy session yang sedang aktif. Harus berada dalam
            transaksi yang sama dengan perubahan data yang di-audit.
        personnel_id: UUID personnel yang melakukan aksi. Harus ada di
            tabel ``toko_jam.personnel``; jika tidak, database akan
            melempar ``IntegrityError`` saat commit.
        action: Jenis aksi yang dilakukan. Nilai yang diizinkan:
            ``"create"``, ``"update"``, ``"delete"``. Nilai lain akan
            menyebabkan ``ValueError`` sebelum INSERT dilakukan.
        table_name: Nama tabel yang diubah oleh aksi tersebut, misalnya
            ``"products"`` atau ``"transactions"``.
        record_id: UUID record spesifik yang diubah. Boleh ``None`` jika
            aksi tidak merujuk pada record tunggal (misalnya bulk update).
        detail: Informasi tambahan berformat dict yang akan disimpan
            sebagai kolom ``detail`` (JSONB). Boleh ``None``.

    Raises:
        ValueError: Jika ``action`` bukan salah satu dari
            ``"create"``, ``"update"``, atau ``"delete"``.
        sqlalchemy.exc.IntegrityError: Jika ``personnel_id`` tidak ada di
            tabel ``toko_jam.personnel`` (pelanggaran foreign key).
            Exception ini muncul saat caller melakukan commit.

    Example:
        >>> write_audit_log(
        ...     session=db,
        ...     personnel_id=current_user.personnel_id,
        ...     action="create",
        ...     table_name="products",
        ...     record_id=new_product.product_id,
        ...     detail={"nama_barang": "Casio G-Shock"},
        ... )
        >>> db.commit()
    """
    if action not in _VALID_ACTIONS:
        raise ValueError(
            f"Invalid action: {action!r}. "
            f"Must be one of: {', '.join(sorted(_VALID_ACTIONS))}"
        )

    log = ActivityLog(
        personnel_id=personnel_id,
        action=action,
        table_name=table_name,
        record_id=record_id,
        detail=detail,
    )
    session.add(log)
