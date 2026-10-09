"""Service layer untuk modul Auth.

Menangani logika bisnis autentikasi dan pendaftaran customer.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.errors import (
    ERR_CONFLICT,
    ERR_FORBIDDEN,
    ERR_INTERNAL,
    error_response,
)

from .repository import (
    create_customer_and_profile_with_audit,
    get_customer_by_phone,
    get_user_profile_by_auth_id,
)
from .schemas import MeResponse, RegisterRequest, RegisterResponse


def resolve_me(current_user: dict) -> MeResponse:
    """Mengembalikan informasi identitas dan role pengguna aktif."""
    return MeResponse(
        auth_user_id=str(current_user["auth_user_id"]),
        role=current_user["role"],
        entity_type=current_user["entity_type"],
        entity_id=str(current_user["entity_id"]),
        username=current_user["username"],
        email=current_user.get("email"),
    )


def register_customer(
    db: Session,
    jwt_payload: dict,
    request: RegisterRequest,
) -> RegisterResponse:
    """
    Validasi dan daftarkan profil customer baru ke database.

    Raises:
        HTTPException 403: Jika auth_user_id tidak cocok dengan sub dari token.
        HTTPException 409: Jika akun atau nomor HP sudah terdaftar.
        HTTPException 500: Jika terjadi error database yang tidak terduga.
    """
    token_sub = jwt_payload.get("sub")
    if str(request.auth_user_id) != str(token_sub):
        raise HTTPException(
            status_code=403,
            detail=error_response(
                ERR_FORBIDDEN,
                "Auth user ID tidak sesuai dengan token",
            ),
        )

    # 1. Cek duplikasi auth_user_id
    if get_user_profile_by_auth_id(db, request.auth_user_id):
        raise HTTPException(
            status_code=409,
            detail=error_response(ERR_CONFLICT, "Akun sudah terdaftar"),
        )

    # 2. Cek duplikasi no_hp
    if get_customer_by_phone(db, request.no_hp):
        raise HTTPException(
            status_code=409,
            detail=error_response(ERR_CONFLICT, "Nomor HP sudah terdaftar"),
        )

    # 3. Simpan data secara transaksional
    try:
        customer, profile = create_customer_and_profile_with_audit(
            db=db,
            auth_user_id=request.auth_user_id,
            nama=request.nama,
            no_hp=request.no_hp,
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=error_response(
                ERR_INTERNAL,
                "Terjadi kesalahan saat memproses pendaftaran",
            ),
        ) from exc

    return RegisterResponse(
        customer_id=customer.customer_id,
        auth_user_id=profile.auth_user_id,
        role="customer",
    )
