"""
Error handling dan konstanta kode error untuk Dewa Jam API.

Menyediakan format error standar, konstanta kode error, dan
exception handler yang didaftarkan ke instance FastAPI di main.py.
"""

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# ---------------------------------------------------------------------------
# Konstanta kode error
# ---------------------------------------------------------------------------

ERR_BAD_REQUEST = "bad_request"
ERR_UNAUTHORIZED = "unauthorized"
ERR_FORBIDDEN = "forbidden"
ERR_NOT_FOUND = "not_found"
ERR_CONFLICT = "conflict"
ERR_VALIDATION = "validation_error"
ERR_INTERNAL = "internal_error"
ERR_SERVICE_UNAVAILABLE = "service_unavailable"


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def error_response(code: str, message: str, detail=None) -> dict:
    """
    Buat dict response error standar.

    Format: ``{"error": {"code": ..., "message": ..., "detail": ...}}``

    Field ``detail`` selalu hadir; nilainya ``null`` jika tidak diberikan.

    Args:
        code: Kode error (gunakan konstanta ``ERR_*`` di atas).
        message: Pesan ramah manusia.
        detail: Data tambahan (opsional); default ``None`` → ``null``.

    Returns:
        Dict dengan format error standar.
    """
    return {"error": {"code": code, "message": message, "detail": detail}}


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handler global untuk exception yang tidak tertangani.

    Mengembalikan HTTP 500 tanpa mengekspos detail internal atau stack trace.
    """
    return JSONResponse(
        status_code=500,
        content=error_response(ERR_INTERNAL, "Terjadi kesalahan internal server"),
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """
    Handler untuk ``HTTPException`` (Starlette/FastAPI).

    Jika ``exc.detail`` sudah berformat standar ``{"error": {...}}``,
    gunakan apa adanya. Selain itu, bungkus ke format standar.
    """
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        content = exc.detail
    else:
        # Routing errors (404, 405) dan HTTPException manual tanpa format khusus
        code_map = {
            401: ERR_UNAUTHORIZED,
            403: ERR_FORBIDDEN,
            404: ERR_NOT_FOUND,
            405: ERR_INTERNAL,
        }
        code = code_map.get(exc.status_code, ERR_INTERNAL)
        message = str(exc.detail) if exc.detail else "Terjadi kesalahan"
        content = error_response(code, message)

    return JSONResponse(status_code=exc.status_code, content=content)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handler untuk ``RequestValidationError`` (Pydantic validation failure).

    Mengembalikan HTTP 422 dengan ``detail`` berupa array
    ``[{"field": "...", "reason": "..."}]``.
    """
    errors = []
    for error in exc.errors():
        field_path = ".".join(str(loc) for loc in error["loc"])
        errors.append({"field": field_path, "reason": error["msg"]})

    return JSONResponse(
        status_code=422,
        content=error_response(ERR_VALIDATION, "Validasi gagal", errors),
    )
