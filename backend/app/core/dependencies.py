"""
Dependency FastAPI untuk autentikasi dan otorisasi berbasis RBAC.

Alur:
1. ``get_current_user`` memverifikasi JWT Bearer token dari header
   ``Authorization``.
2. Sub (UUID Supabase Auth) digunakan untuk mencari ``user_profiles``.
3. ``resolve_role`` memetakan data ``personnel``/``staff`` ke satu dari
   5 role sistem: ``admin``, ``manager``, ``kasir``, ``gudang``,
   ``customer``.
4. ``require_role`` adalah factory yang menghasilkan dependency
   untuk melindungi endpoint dengan RBAC.

Role tidak pernah dibaca dari JWT claims — selalu dari database.
"""

import uuid
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException
from jwt import PyJWKClient
from sqlalchemy import UUID, CheckConstraint, String, UniqueConstraint
from sqlalchemy import exc as sa_exc
from sqlalchemy.orm import Session

from .config import settings
from .database import Base, get_db
from .errors import (
    ERR_FORBIDDEN,
    ERR_SERVICE_UNAVAILABLE,
    ERR_UNAUTHORIZED,
    error_response,
)

# ---------------------------------------------------------------------------
# Konstanta role yang valid di sistem
# ---------------------------------------------------------------------------

VALID_ROLES: frozenset[str] = frozenset(
    {"customer", "kasir", "gudang", "manager", "admin"}
)


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    """Create one cached Supabase JWKS client per backend process."""
    url = settings.SUPABASE_JWKS_URL or (
        f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    )
    return PyJWKClient(url)


def _decode_access_token(token: str) -> dict:
    """Verify legacy HS256 and current Supabase ES256/RS256 access tokens."""
    try:
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg")
        if algorithm == "HS256":
            key = settings.SUPABASE_JWT_SECRET
        elif algorithm in {"ES256", "RS256"}:
            key = _jwks_client().get_signing_key_from_jwt(token).key
        else:
            raise jwt.InvalidAlgorithmError("Algoritma JWT tidak didukung")

        return jwt.decode(
            token,
            key,
            algorithms=[algorithm],
            options={"verify_aud": False},
        )
    except jwt.InvalidTokenError:
        raise
    except Exception as exc:
        # PyJWKClientError and network errors must not leak implementation
        # details through the authentication endpoint.
        raise jwt.InvalidTokenError("JWT verification failed") from exc


# ---------------------------------------------------------------------------
# SQLAlchemy models
# ---------------------------------------------------------------------------

from sqlalchemy import Column, DateTime, ForeignKey, func  # noqa: E402


class UserProfile(Base):
    """
    Mapping antara UUID Supabase Auth (``auth_user_id``) dengan entitas
    internal sistem (personnel atau customer).

    Tabel ini dibuat via migrasi Alembic (002_add_user_profiles).
    Model di sini tidak membuat tabel — hanya memetakan ke tabel yang ada.
    """

    __tablename__ = "user_profiles"
    __table_args__ = (
        CheckConstraint(
            "entity_type IN ('personnel', 'customer')",
            name="check_entity_type",
        ),
        UniqueConstraint("entity_type", "entity_id", name="uq_entity"),
        {"schema": "toko_jam"},
    )

    auth_user_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="FK ke auth.users(id) di Supabase Auth schema",
    )
    entity_type = Column(
        String,
        nullable=False,
        comment="'personnel' atau 'customer'",
    )
    entity_id = Column(
        UUID(as_uuid=True),
        nullable=False,
        comment="FK ke personnel_id atau customer_id",
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class Personnel(Base):
    """
    Entitas induk untuk semua personnel internal: admin, manager, staf.

    Tabel yang ada: ``toko_jam.personnel``.
    """

    __tablename__ = "personnel"
    __table_args__ = (
        CheckConstraint(
            "personnel_type IN ('admin', 'staff', 'manager')",
            name="check_personnel_type",
        ),
        {"schema": "toko_jam"},
    )

    personnel_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    personnel_type = Column(
        String,
        nullable=False,
        comment="'admin', 'staff', atau 'manager'",
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class Staff(Base):
    """
    Staf operasional atau gudang.

    Tabel yang ada: ``toko_jam.staff``.
    Kolom ``personnel_id`` adalah FK ke ``toko_jam.personnel`` sekaligus
    UNIQUE (satu personnel hanya bisa jadi satu staff).
    """

    __tablename__ = "staff"
    __table_args__ = (
        CheckConstraint(
            "role IN ('staf_gudang', 'staf_operasional')",
            name="check_staff_role",
        ),
        {"schema": "toko_jam"},
    )

    staff_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    personnel_id = Column(
        UUID(as_uuid=True),
        ForeignKey("toko_jam.personnel.personnel_id"),
        nullable=False,
        unique=True,
    )
    manager_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        comment="FK ke toko_jam.managers.manager_id (opsional)",
    )
    username = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    nama = Column(String, nullable=False)
    role = Column(
        String,
        nullable=False,
        comment="'staf_gudang' atau 'staf_operasional'",
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


# ---------------------------------------------------------------------------
# Role resolution
# ---------------------------------------------------------------------------


def resolve_role(db: Session, profile: UserProfile) -> str:
    """
    Tentukan role sistem dari data ``user_profiles`` dan tabel personnel.

    Mapping:
    - ``entity_type = 'customer'``                              → ``'customer'``
    - ``personnel_type = 'admin'``                              → ``'admin'``
    - ``personnel_type = 'manager'``                            → ``'manager'``
    - ``personnel_type = 'staff'`` + ``role = 'staf_operasional'`` → ``'kasir'``
    - ``personnel_type = 'staff'`` + ``role = 'staf_gudang'``  → ``'gudang'``

    Args:
        db: SQLAlchemy session aktif.
        profile: Instance ``UserProfile`` milik pengguna.

    Returns:
        Salah satu dari: ``'customer'``, ``'admin'``, ``'manager'``,
        ``'kasir'``, ``'gudang'``.

    Raises:
        HTTPException 403: Jika entitas tidak ditemukan atau role tidak valid.
        HTTPException 503: Jika database tidak bisa dijangkau.
    """
    if profile.entity_type == "customer":
        return "customer"

    # entity_type == 'personnel'
    try:
        personnel = (
            db.query(Personnel)
            .filter(Personnel.personnel_id == profile.entity_id)
            .first()
        )
    except sa_exc.OperationalError as exc:
        raise HTTPException(
            status_code=503,
            detail=error_response(
                ERR_SERVICE_UNAVAILABLE,
                "Layanan database tidak tersedia",
            ),
        ) from exc

    if not personnel:
        raise HTTPException(
            status_code=403,
            detail=error_response(
                ERR_FORBIDDEN,
                "Data personnel tidak ditemukan",
            ),
        )

    if personnel.personnel_type == "admin":
        return "admin"
    elif personnel.personnel_type == "manager":
        return "manager"
    elif personnel.personnel_type == "staff":
        try:
            staff = (
                db.query(Staff).filter(Staff.personnel_id == profile.entity_id).first()
            )
        except sa_exc.OperationalError as exc:
            raise HTTPException(
                status_code=503,
                detail=error_response(
                    ERR_SERVICE_UNAVAILABLE,
                    "Layanan database tidak tersedia",
                ),
            ) from exc

        if staff:
            if staff.role == "staf_operasional":
                return "kasir"
            elif staff.role == "staf_gudang":
                return "gudang"

    raise HTTPException(
        status_code=403,
        detail=error_response(ERR_FORBIDDEN, "Role tidak valid"),
    )


# ---------------------------------------------------------------------------
# Dependency: get_current_user
# ---------------------------------------------------------------------------


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> dict:
    """
    FastAPI dependency — verifikasi JWT dan kembalikan data pengguna.

    Memverifikasi header ``Authorization: Bearer <token>`` menggunakan
    ``SUPABASE_JWT_SECRET``.  Setelah token valid, mencari ``user_profiles``
    di database dan meresolusi role.

    Args:
        authorization: Nilai header HTTP ``Authorization``.
        db: SQLAlchemy session (di-inject oleh FastAPI).

    Returns:
        Dict dengan key:
        - ``auth_user_id`` (str): UUID Supabase Auth.
        - ``entity_type`` (str): ``'personnel'`` atau ``'customer'``.
        - ``entity_id`` (str): UUID entitas internal.
        - ``role`` (str): Role sistem yang telah diresolusi.

    Raises:
        HTTPException 401: Token tidak ada, tidak valid, atau kedaluwarsa.
        HTTPException 403: User tidak terdaftar di ``user_profiles``.
        HTTPException 503: Database tidak bisa dijangkau.
    """
    # 1. Cek header
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail=error_response(ERR_UNAUTHORIZED, "Token tidak ditemukan"),
        )

    token = authorization.split(" ", 1)[1]

    # 2. Verifikasi JWT
    try:
        payload = _decode_access_token(token)
        auth_user_id: str | None = payload.get("sub")
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=401,
            detail=error_response(ERR_UNAUTHORIZED, "Token kedaluwarsa"),
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=401,
            detail=error_response(ERR_UNAUTHORIZED, "Token tidak valid"),
        ) from exc

    if not auth_user_id:
        raise HTTPException(
            status_code=401,
            detail=error_response(ERR_UNAUTHORIZED, "Token tidak valid: sub kosong"),
        )

    # 3. Cari user_profiles
    try:
        profile = (
            db.query(UserProfile)
            .filter(UserProfile.auth_user_id == auth_user_id)
            .first()
        )
    except sa_exc.OperationalError as exc:
        raise HTTPException(
            status_code=503,
            detail=error_response(
                ERR_SERVICE_UNAVAILABLE,
                "Layanan database tidak tersedia",
            ),
        ) from exc

    if not profile:
        raise HTTPException(
            status_code=403,
            detail=error_response(
                ERR_FORBIDDEN,
                "Pengguna tidak terdaftar di sistem",
            ),
        )

    # 4. Resolve role
    role = resolve_role(db, profile)

    email = payload.get("email")
    username = email.split("@", 1)[0] if isinstance(email, str) and email else "Personnel"
    if profile.entity_type == "personnel":
        staff = db.query(Staff).filter(Staff.personnel_id == profile.entity_id).first()
        if staff:
            username = staff.username

    return {
        "auth_user_id": auth_user_id,
        "entity_type": profile.entity_type,
        "entity_id": str(profile.entity_id),
        "role": role,
        "username": username,
        "email": email,
    }


# ---------------------------------------------------------------------------
# Dependency factory: require_role
# ---------------------------------------------------------------------------


def require_role(*allowed_roles: str):
    """
    Factory dependency untuk RBAC endpoint.

    Validasi dilakukan **saat inisialisasi** (waktu dekorasi route), bukan
    saat request masuk.  Jika ada role yang tidak valid, ``ValueError``
    dilempar sebelum server berjalan.

    Usage::

        @router.get("/orders")
        def list_orders(user=Depends(require_role("kasir", "manager"))):
            ...

    Args:
        *allowed_roles: Satu atau lebih role yang diizinkan mengakses endpoint.
            Harus merupakan subset dari
            ``{'customer', 'kasir', 'gudang', 'manager', 'admin'}``.

    Returns:
        Callable dependency FastAPI yang memeriksa role ``current_user``.

    Raises:
        ValueError: Jika salah satu role dalam ``allowed_roles`` tidak valid
            (dievaluasi saat startup, bukan saat request).
        HTTPException 403: Jika role pengguna tidak ada dalam ``allowed_roles``
            (dievaluasi saat request).
    """
    for role in allowed_roles:
        if role not in VALID_ROLES:
            raise ValueError(
                f"Role tidak valid: '{role}'. "
                f"Role yang diizinkan: {sorted(VALID_ROLES)}"
            )

    def _check_role(
        current_user: Annotated[dict, Depends(get_current_user)],
    ) -> dict:
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=error_response(ERR_FORBIDDEN, "Akses ditolak"),
            )
        return current_user

    return _check_role


# ---------------------------------------------------------------------------
# Dependency: get_jwt_payload_only
# ---------------------------------------------------------------------------


def get_jwt_payload_only(
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    """
    Ekstrak dan verifikasi JWT dari header Authorization tanpa memeriksa
    tabel user_profiles.

    Digunakan untuk endpoint pendaftaran customer baru (POST /api/v1/auth/register)
    di mana user baru saja mendaftar di Supabase Auth sehingga profil belum
    tersimpan di database.

    Returns:
        dict: JWT payload yang telah diverifikasi (memuat 'sub', dsb.).

    Raises:
        HTTPException 401: Jika token tidak ditemukan, expired, atau tidak valid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail=error_response(ERR_UNAUTHORIZED, "Token tidak ditemukan"),
        )

    token = authorization.split(" ", 1)[1]

    try:
        payload = _decode_access_token(token)
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=401,
            detail=error_response(ERR_UNAUTHORIZED, "Token kedaluwarsa"),
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=401,
            detail=error_response(ERR_UNAUTHORIZED, "Token tidak valid"),
        ) from exc

    if not payload.get("sub"):
        raise HTTPException(
            status_code=401,
            detail=error_response(ERR_UNAUTHORIZED, "Token tidak valid: sub kosong"),
        )

    return payload
