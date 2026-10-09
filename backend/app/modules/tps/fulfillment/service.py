"""Shipping provider abstraction with a deterministic placeholder provider."""

from decimal import Decimal

from .schemas import ShippingQuoteResponse

PLACEHOLDER_RATE_PER_KM = Decimal("3000")
PLACEHOLDER_BASE_DISTANCE_KM = Decimal("1")


def calculate_shipping_quote(address: str) -> ShippingQuoteResponse:
    """Return a stable quote until a geocoding/courier provider is integrated.

    The current distance is deliberately deterministic and documented as a
    placeholder. The response contract can later be backed by a real provider.
    """
    distance = PLACEHOLDER_BASE_DISTANCE_KM + Decimal(len(address.strip()) % 20)
    fee = distance * PLACEHOLDER_RATE_PER_KM
    return ShippingQuoteResponse(
        provider="placeholder",
        distance_km=distance,
        rate_per_km=PLACEHOLDER_RATE_PER_KM,
        shipping_fee=fee,
        estimated_delivery_days=2,
    )
