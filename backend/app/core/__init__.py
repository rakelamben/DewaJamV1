"""Public API for the core package."""

from app.core.audit import ActivityLog, write_audit_log
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine, get_db
from app.core.dependencies import (
    VALID_ROLES,
    Personnel,
    Staff,
    UserProfile,
    get_current_user,
    require_role,
    resolve_role,
)
from app.core.errors import (
    ERR_FORBIDDEN,
    ERR_INTERNAL,
    ERR_NOT_FOUND,
    ERR_SERVICE_UNAVAILABLE,
    ERR_UNAUTHORIZED,
    ERR_VALIDATION,
    error_response,
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.core.events import publish, subscribe

__all__ = [
    # audit
    "write_audit_log",
    "ActivityLog",
    # config
    "settings",
    # database
    "get_db",
    "Base",
    "SessionLocal",
    "engine",
    # dependencies
    "get_current_user",
    "require_role",
    "resolve_role",
    "UserProfile",
    "Personnel",
    "Staff",
    "VALID_ROLES",
    # errors
    "ERR_UNAUTHORIZED",
    "ERR_FORBIDDEN",
    "ERR_NOT_FOUND",
    "ERR_VALIDATION",
    "ERR_INTERNAL",
    "ERR_SERVICE_UNAVAILABLE",
    "error_response",
    "global_exception_handler",
    "http_exception_handler",
    "validation_exception_handler",
    # events
    "publish",
    "subscribe",
]
