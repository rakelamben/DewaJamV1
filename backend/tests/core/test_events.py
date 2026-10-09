"""
Unit tests untuk app.core.events (event bus publish/subscribe).

Requirements: 7.1, 7.2, 7.3
"""

import pytest

from app.core import events


@pytest.fixture(autouse=True)
def reset_subscribers():
    """Bersihkan semua subscriber sebelum dan sesudah tiap test."""
    events._subscribers.clear()
    yield
    events._subscribers.clear()


# ---------------------------------------------------------------------------
# publish
# ---------------------------------------------------------------------------


def test_publish_without_subscribers_does_not_raise():
    """publish ke event tanpa subscriber tidak boleh raise exception."""
    # Tidak ada subscriber → harus selesai tanpa error
    events.publish("order.created", {"order_id": 1})


def test_publish_calls_single_handler_with_correct_payload():
    """publish dengan satu subscriber harus memanggil handler dengan payload benar."""
    received = []

    def handler(payload):
        received.append(payload)

    events.subscribe("order.created", handler)
    events.publish("order.created", {"order_id": 42})

    assert received == [{"order_id": 42}]


def test_publish_calls_all_handlers_when_multiple_subscribers():
    """publish dengan beberapa subscriber harus memanggil semua handler."""
    calls = []

    def handler_a(payload):
        calls.append(("a", payload))

    def handler_b(payload):
        calls.append(("b", payload))

    def handler_c(payload):
        calls.append(("c", payload))

    events.subscribe("stock.updated", handler_a)
    events.subscribe("stock.updated", handler_b)
    events.subscribe("stock.updated", handler_c)

    events.publish("stock.updated", {"sku": "WCH-001", "qty": 10})

    assert len(calls) == 3
    assert ("a", {"sku": "WCH-001", "qty": 10}) in calls
    assert ("b", {"sku": "WCH-001", "qty": 10}) in calls
    assert ("c", {"sku": "WCH-001", "qty": 10}) in calls


def test_publish_continues_to_next_handler_when_one_raises():
    """Jika satu handler raise exception, handler berikutnya tetap harus dipanggil."""
    calls = []

    def failing_handler(payload):
        raise RuntimeError("handler error")

    def succeeding_handler(payload):
        calls.append(payload)

    events.subscribe("payment.confirmed", failing_handler)
    events.subscribe("payment.confirmed", succeeding_handler)

    # Tidak boleh raise ke caller
    events.publish("payment.confirmed", {"payment_id": 99})

    assert calls == [{"payment_id": 99}]


# ---------------------------------------------------------------------------
# subscribe – validasi event_name
# ---------------------------------------------------------------------------


def test_subscribe_raises_value_error_for_empty_event_name():
    """subscribe dengan event_name kosong harus raise ValueError."""
    with pytest.raises(ValueError):
        events.subscribe("", lambda payload: None)


def test_subscribe_raises_value_error_for_event_name_exceeding_255_chars():
    """subscribe dengan event_name > 255 karakter harus raise ValueError."""
    long_name = "a" * 256
    with pytest.raises(ValueError):
        events.subscribe(long_name, lambda payload: None)


def test_subscribe_accepts_event_name_of_exactly_255_chars():
    """subscribe dengan event_name tepat 255 karakter harus berhasil."""
    name_255 = "a" * 255
    handler_called = []

    def handler(payload):
        handler_called.append(payload)

    events.subscribe(name_255, handler)
    events.publish(name_255, {"ok": True})

    assert handler_called == [{"ok": True}]
