"""Routing endpoint untuk modul Auth."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_jwt_payload_only

from .schemas import MeResponse, RegisterRequest, RegisterResponse
from .service import register_customer, resolve_me

router = APIRouter()


@router.get("/me", response_model=MeResponse, summary="Get profil user saat ini")
def get_me(
    current_user: Annotated[dict, Depends(get_current_user)],
) -> MeResponse:
    """Mengembalikan informasi profil dan role pengguna yang sedang login."""
    return resolve_me(current_user)


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrasi customer baru",
)
def post_register(
    body: RegisterRequest,
    jwt_payload: Annotated[dict, Depends(get_jwt_payload_only)],
    db: Annotated[Session, Depends(get_db)],
) -> RegisterResponse:
    """Mendaftarkan customer baru dan menghubungkannya dengan akun Supabase Auth."""
    return register_customer(db=db, jwt_payload=jwt_payload, request=body)
