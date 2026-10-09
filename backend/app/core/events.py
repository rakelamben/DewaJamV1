"""
Event Bus untuk Dewa Jam.

Modul ini menyediakan mekanisme publish/subscribe in-process yang sinkron.
Digunakan untuk komunikasi antar domain tanpa coupling langsung.
"""

import logging
from typing import Callable

logger = logging.getLogger(__name__)

_subscribers: dict[str, list[Callable[[dict], None]]] = {}


def subscribe(event_name: str, handler: Callable[[dict], None]) -> None:
    """
    Daftarkan handler untuk event tertentu.

    Args:
        event_name: Nama event (non-empty, max 255 karakter).
        handler: Fungsi yang menerima dict payload.

    Raises:
        ValueError: Jika event_name kosong atau melebihi 255 karakter.
    """
    if not event_name or len(event_name) > 255:
        raise ValueError("event_name harus non-empty dan max 255 karakter")

    if event_name not in _subscribers:
        _subscribers[event_name] = []
    _subscribers[event_name].append(handler)


def publish(event_name: str, payload: dict) -> None:
    """
    Publikasikan event ke semua subscriber yang terdaftar.

    Semua handler dipanggil secara sinkron. Jika salah satu handler
    melempar exception, exception tersebut di-log sebagai WARNING dan
    eksekusi dilanjutkan ke handler berikutnya.

    Args:
        event_name: Nama event (non-empty, max 255 karakter).
        payload: Dict data event yang dikirim ke setiap handler.

    Raises:
        ValueError: Jika event_name kosong atau melebihi 255 karakter.
    """
    if not event_name or len(event_name) > 255:
        raise ValueError("event_name harus non-empty dan max 255 karakter")

    handlers = _subscribers.get(event_name, [])
    for handler in handlers:
        try:
            handler(payload)
        except Exception as e:
            logger.warning(
                "Handler untuk event '%s' gagal: %s",
                event_name,
                e,
                exc_info=True,
            )
