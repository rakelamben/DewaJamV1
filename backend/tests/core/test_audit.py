"""Unit test untuk core/audit.py.

Memverifikasi perilaku ``write_audit_log``:
- Requirements 5.1: setiap perubahan data dicatat ke audit log
- Requirements 5.2: action tidak valid menimbulkan ValueError sebelum INSERT
- Requirements 5.3: fungsi tidak memanggil commit (transaksi dikelola pemanggil)
"""

import uuid
from unittest.mock import MagicMock

import pytest

from app.core.audit import ActivityLog, write_audit_log

# ---------------------------------------------------------------------------
# Requirements 5.1 – action valid: objek ActivityLog ditambahkan ke session
# ---------------------------------------------------------------------------


def test_write_audit_log_valid_action_adds_to_session():
    """Action valid harus memanggil session.add() dengan objek ActivityLog."""
    mock_session = MagicMock()
    personnel_id = uuid.uuid4()

    write_audit_log(mock_session, personnel_id, "create", "products")

    mock_session.add.assert_called_once()
    added_obj = mock_session.add.call_args[0][0]
    assert isinstance(added_obj, ActivityLog)
    assert added_obj.action == "create"


def test_write_audit_log_stores_correct_fields():
    """Semua field yang diberikan harus tersimpan di objek ActivityLog."""
    mock_session = MagicMock()
    personnel_id = uuid.uuid4()
    record_id = uuid.uuid4()
    detail = {"nama_barang": "Casio G-Shock", "harga": 500000}

    write_audit_log(
        mock_session,
        personnel_id,
        "update",
        "products",
        record_id=record_id,
        detail=detail,
    )

    added_obj = mock_session.add.call_args[0][0]
    assert isinstance(added_obj, ActivityLog)
    assert added_obj.personnel_id == personnel_id
    assert added_obj.action == "update"
    assert added_obj.table_name == "products"
    assert added_obj.record_id == record_id
    assert added_obj.detail == detail


@pytest.mark.parametrize("action", ["create", "update", "delete"])
def test_write_audit_log_all_valid_actions_accepted(action):
    """Ketiga action yang valid ('create', 'update', 'delete') harus diterima."""
    mock_session = MagicMock()
    personnel_id = uuid.uuid4()

    write_audit_log(mock_session, personnel_id, action, "orders")

    mock_session.add.assert_called_once()
    added_obj = mock_session.add.call_args[0][0]
    assert added_obj.action == action


def test_write_audit_log_optional_fields_default_to_none():
    """record_id dan detail bersifat opsional dan default ke None."""
    mock_session = MagicMock()
    personnel_id = uuid.uuid4()

    write_audit_log(mock_session, personnel_id, "delete", "transactions")

    added_obj = mock_session.add.call_args[0][0]
    assert added_obj.record_id is None
    assert added_obj.detail is None


# ---------------------------------------------------------------------------
# Requirements 5.2 – action tidak valid: ValueError sebelum INSERT
# ---------------------------------------------------------------------------


def test_write_audit_log_invalid_action_raises_before_insert():
    """Action tidak valid harus mengangkat ValueError sebelum session.add()."""
    mock_session = MagicMock()
    personnel_id = uuid.uuid4()

    with pytest.raises(ValueError):
        write_audit_log(mock_session, personnel_id, "invalid_action", "products")

    mock_session.add.assert_not_called()


@pytest.mark.parametrize(
    "bad_action",
    ["read", "view", "CREATE", "DELETE", "", "  ", "upsert"],
)
def test_write_audit_log_various_invalid_actions_raise(bad_action):
    """Berbagai nilai action yang tidak valid semuanya harus mengangkat ValueError."""
    mock_session = MagicMock()
    personnel_id = uuid.uuid4()

    with pytest.raises(ValueError):
        write_audit_log(mock_session, personnel_id, bad_action, "products")

    mock_session.add.assert_not_called()


def test_write_audit_log_invalid_action_error_message_mentions_action():
    """Pesan ValueError harus menyebutkan action yang diberikan."""
    mock_session = MagicMock()
    personnel_id = uuid.uuid4()

    with pytest.raises(ValueError, match="bad_action"):
        write_audit_log(mock_session, personnel_id, "bad_action", "products")


# ---------------------------------------------------------------------------
# Requirements 5.3 – tidak auto-commit: commit dikelola pemanggil
# ---------------------------------------------------------------------------


def test_write_audit_log_does_not_commit():
    """write_audit_log tidak boleh memanggil session.commit()."""
    mock_session = MagicMock()
    personnel_id = uuid.uuid4()

    write_audit_log(mock_session, personnel_id, "update", "products")

    mock_session.commit.assert_not_called()


def test_write_audit_log_does_not_flush():
    """write_audit_log tidak boleh memanggil session.flush() secara implisit."""
    mock_session = MagicMock()
    personnel_id = uuid.uuid4()

    write_audit_log(mock_session, personnel_id, "create", "products")

    mock_session.flush.assert_not_called()


def test_write_audit_log_does_not_rollback():
    """write_audit_log tidak boleh memanggil session.rollback()."""
    mock_session = MagicMock()
    personnel_id = uuid.uuid4()

    write_audit_log(mock_session, personnel_id, "delete", "products")

    mock_session.rollback.assert_not_called()
