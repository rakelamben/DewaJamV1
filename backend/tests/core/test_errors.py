"""
Unit test untuk core/errors.py.

Memverifikasi:
- format error standar dari error_response()
- ValidationException handler → HTTP 422 dengan field/reason
- Global exception handler → HTTP 500 tanpa stack trace
- HTTP exception handler → format standar
Requirements: 6.1, 6.2, 6.3, 6.6
"""

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.errors import (
    ERR_FORBIDDEN,
    ERR_INTERNAL,
    ERR_NOT_FOUND,
    ERR_UNAUTHORIZED,
    ERR_VALIDATION,
    error_response,
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)

# ---------------------------------------------------------------------------
# Minimal test app
# ---------------------------------------------------------------------------


def build_test_app() -> FastAPI:
    """Buat app minimal dengan handler error dan endpoint pengujian."""
    app = FastAPI()
    app.add_exception_handler(Exception, global_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    class Item(BaseModel):
        name: str
        price: int

    @app.post("/items")
    async def create_item(item: Item) -> dict:
        return item.model_dump()

    @app.get("/http-error/{status_code}")
    async def raise_http_error(status_code: int) -> dict:
        raise StarletteHTTPException(status_code=status_code)

    @app.get("/http-error-custom")
    async def raise_http_error_custom() -> dict:
        raise StarletteHTTPException(
            status_code=403,
            detail=error_response(ERR_FORBIDDEN, "Akses ditolak"),
        )

    @app.get("/internal-error")
    async def raise_internal_error() -> dict:
        raise RuntimeError("unexpected crash")

    return app


_test_app = build_test_app()
_client = TestClient(_test_app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Tests: error_response()
# ---------------------------------------------------------------------------


class TestErrorResponse:
    """Verifikasi format dict error_response()."""

    def test_always_has_detail_field_when_omitted(self) -> None:
        """Field 'detail' harus selalu ada meski tidak diberikan (nilai null)."""
        result = error_response("test_code", "pesan test")
        assert "error" in result
        assert "detail" in result["error"]
        assert result["error"]["detail"] is None

    def test_detail_field_present_when_none_explicit(self) -> None:
        """Field 'detail' tetap ada saat eksplisit None."""
        result = error_response("test_code", "pesan test", detail=None)
        assert "detail" in result["error"]
        assert result["error"]["detail"] is None

    def test_detail_field_with_value(self) -> None:
        """Field 'detail' memuat nilai yang diberikan."""
        detail_data = {"key": "value", "count": 3}
        result = error_response("test_code", "pesan test", detail=detail_data)
        assert result["error"]["detail"] == detail_data

    def test_detail_field_with_list(self) -> None:
        """Field 'detail' bisa berupa list."""
        detail_list = [{"field": "name", "reason": "required"}]
        result = error_response("test_code", "pesan test", detail=detail_list)
        assert result["error"]["detail"] == detail_list

    def test_code_and_message_present(self) -> None:
        """Field 'code' dan 'message' harus ada dan sesuai input."""
        result = error_response("err_code", "pesan error")
        assert result["error"]["code"] == "err_code"
        assert result["error"]["message"] == "pesan error"

    def test_structure_is_nested_under_error_key(self) -> None:
        """Response dibungkus dalam key 'error' (bukan di root)."""
        result = error_response("c", "m")
        assert list(result.keys()) == ["error"]
        assert set(result["error"].keys()) == {"code", "message", "detail"}


# ---------------------------------------------------------------------------
# Tests: error constants
# ---------------------------------------------------------------------------


class TestErrorConstants:
    """Verifikasi konstanta kode error terdefinisi dan unik."""

    def test_all_constants_defined(self) -> None:
        """Semua konstanta ERR_* harus bernilai string."""
        constants = [
            ERR_UNAUTHORIZED,
            ERR_FORBIDDEN,
            ERR_NOT_FOUND,
            ERR_VALIDATION,
            ERR_INTERNAL,
        ]
        for c in constants:
            assert isinstance(c, str)
            assert len(c) > 0

    def test_constants_are_unique(self) -> None:
        """Setiap konstanta ERR_* harus unik."""
        constants = [
            ERR_UNAUTHORIZED,
            ERR_FORBIDDEN,
            ERR_NOT_FOUND,
            ERR_VALIDATION,
            ERR_INTERNAL,
        ]
        assert len(constants) == len(set(constants))


# ---------------------------------------------------------------------------
# Tests: validation_exception_handler (HTTP 422)
# ---------------------------------------------------------------------------


class TestValidationExceptionHandler:
    """Verifikasi handler RequestValidationError."""

    def test_returns_422_on_invalid_body(self) -> None:
        """Request dengan body tidak valid harus mengembalikan HTTP 422."""
        response = _client.post("/items", json={"price": "bukan_angka"})
        assert response.status_code == 422

    def test_response_has_standard_error_wrapper(self) -> None:
        """Response harus memiliki wrapper 'error' standar."""
        response = _client.post("/items", json={"price": "bukan_angka"})
        body = response.json()
        assert "error" in body

    def test_error_code_is_validation_error(self) -> None:
        """Kode error harus ERR_VALIDATION."""
        response = _client.post("/items", json={"price": "bukan_angka"})
        body = response.json()
        assert body["error"]["code"] == ERR_VALIDATION

    def test_detail_is_array(self) -> None:
        """Field 'detail' harus berupa array."""
        response = _client.post("/items", json={"price": "bukan_angka"})
        body = response.json()
        assert isinstance(body["error"]["detail"], list)

    def test_detail_items_have_field_and_reason(self) -> None:
        """Setiap item dalam detail harus memiliki 'field' dan 'reason'."""
        response = _client.post("/items", json={"price": "bukan_angka"})
        body = response.json()
        for item in body["error"]["detail"]:
            assert "field" in item, f"'field' tidak ada di: {item}"
            assert "reason" in item, f"'reason' tidak ada di: {item}"

    def test_missing_required_field_captured(self) -> None:
        """Field yang hilang harus muncul di detail."""
        response = _client.post("/items", json={})
        body = response.json()
        assert response.status_code == 422
        fields = [item["field"] for item in body["error"]["detail"]]
        # 'name' dan 'price' keduanya wajib
        assert any("name" in f for f in fields)
        assert any("price" in f for f in fields)

    def test_detail_always_present(self) -> None:
        """Field 'detail' harus selalu ada (tidak null) pada validation error."""
        response = _client.post("/items", json={"price": "bukan_angka"})
        body = response.json()
        assert body["error"]["detail"] is not None


# ---------------------------------------------------------------------------
# Tests: global_exception_handler (HTTP 500)
# ---------------------------------------------------------------------------


class TestGlobalExceptionHandler:
    """Verifikasi handler exception tak tertangani."""

    def test_returns_500(self) -> None:
        """Unhandled exception harus mengembalikan HTTP 500."""
        response = _client.get("/internal-error")
        assert response.status_code == 500

    def test_response_has_standard_error_wrapper(self) -> None:
        """Response HTTP 500 harus memiliki wrapper 'error' standar."""
        response = _client.get("/internal-error")
        body = response.json()
        assert "error" in body

    def test_error_code_is_internal_error(self) -> None:
        """Kode error harus ERR_INTERNAL."""
        response = _client.get("/internal-error")
        body = response.json()
        assert body["error"]["code"] == ERR_INTERNAL

    def test_no_stack_trace_in_body(self) -> None:
        """Stack trace tidak boleh muncul di response body."""
        response = _client.get("/internal-error")
        body_text = response.text
        assert "Traceback" not in body_text
        assert "RuntimeError" not in body_text
        assert "unexpected crash" not in body_text

    def test_detail_does_not_expose_internal_info(self) -> None:
        """Field 'detail' tidak boleh mengekspos informasi internal."""
        response = _client.get("/internal-error")
        body = response.json()
        # detail boleh null atau string generik — tidak boleh berisi pesan exception
        detail = body["error"].get("detail")
        if detail is not None:
            detail_str = str(detail)
            assert "unexpected crash" not in detail_str
            assert "RuntimeError" not in detail_str


# ---------------------------------------------------------------------------
# Tests: http_exception_handler
# ---------------------------------------------------------------------------


class TestHttpExceptionHandler:
    """Verifikasi handler HTTPException."""

    def test_404_returns_not_found_code(self) -> None:
        """HTTP 404 harus memakai kode ERR_NOT_FOUND."""
        response = _client.get("/http-error/404")
        body = response.json()
        assert response.status_code == 404
        assert body["error"]["code"] == ERR_NOT_FOUND

    def test_401_returns_unauthorized_code(self) -> None:
        """HTTP 401 harus memakai kode ERR_UNAUTHORIZED."""
        response = _client.get("/http-error/401")
        body = response.json()
        assert response.status_code == 401
        assert body["error"]["code"] == ERR_UNAUTHORIZED

    def test_403_returns_forbidden_code(self) -> None:
        """HTTP 403 harus memakai kode ERR_FORBIDDEN."""
        response = _client.get("/http-error/403")
        body = response.json()
        assert response.status_code == 403
        assert body["error"]["code"] == ERR_FORBIDDEN

    def test_response_has_standard_error_wrapper(self) -> None:
        """Semua HTTP error harus menggunakan wrapper 'error' standar."""
        response = _client.get("/http-error/404")
        body = response.json()
        assert "error" in body
        assert set(body["error"].keys()) == {"code", "message", "detail"}

    def test_detail_field_always_present(self) -> None:
        """Field 'detail' harus selalu ada pada HTTPException."""
        response = _client.get("/http-error/404")
        body = response.json()
        assert "detail" in body["error"]

    def test_pre_formatted_detail_passthrough(self) -> None:
        """Jika detail sudah berformat standar, harus diteruskan apa adanya."""
        response = _client.get("/http-error-custom")
        body = response.json()
        assert response.status_code == 403
        assert body["error"]["code"] == ERR_FORBIDDEN
        assert body["error"]["message"] == "Akses ditolak"

    def test_status_code_preserved(self) -> None:
        """HTTP status code harus sesuai dengan exc.status_code."""
        for status_code in [401, 403, 404]:
            response = _client.get(f"/http-error/{status_code}")
            assert response.status_code == status_code
