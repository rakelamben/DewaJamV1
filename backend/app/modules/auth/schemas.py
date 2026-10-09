"""Pydantic schemas untuk modul Auth."""

import re
import uuid

from pydantic import BaseModel, Field, field_validator


class MeResponse(BaseModel):
    """Response untuk GET /api/v1/auth/me."""

    auth_user_id: str
    role: str
    entity_type: str
    entity_id: str
    username: str
    email: str | None = None


class RegisterRequest(BaseModel):
    """Request body untuk POST /api/v1/auth/register."""

    auth_user_id: uuid.UUID
    nama: str = Field(min_length=1, max_length=100)
    no_hp: str

    @field_validator("nama")
    @classmethod
    def nama_not_whitespace_only(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("nama tidak boleh hanya spasi")
        return v.strip()

    @field_validator("no_hp")
    @classmethod
    def validate_no_hp(cls, v: str) -> str:
        """
        Format: opsional '+' diikuti 7–14 digit (total 8-15 karakter).
        """
        pattern = r"^\+?\d{7,14}$"
        if not re.match(pattern, v):
            raise ValueError(
                "no_hp harus berformat 8–15 karakter: opsional '+' diikuti digit"
            )
        return v


class RegisterResponse(BaseModel):
    """Response untuk POST /api/v1/auth/register (201)."""

    customer_id: uuid.UUID
    auth_user_id: uuid.UUID
    role: str = "customer"
