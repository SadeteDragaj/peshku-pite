"""Pluggable payment provider abstraction.

To swap providers, implement PaymentProvider and update get_payment_provider().
"""

from __future__ import annotations

import abc
from dataclasses import dataclass


@dataclass
class PaymentIntentResult:
    provider_intent_id: str
    client_secret: str
    amount: int  # smallest currency unit (cents)
    currency: str


@dataclass
class WebhookEvent:
    event_type: str  # e.g. "payment_intent.succeeded"
    intent_id: str
    status: str  # mapped to PaymentStatus


class PaymentProvider(abc.ABC):
    """Interface every payment provider must implement."""

    @abc.abstractmethod
    async def create_intent(self, amount_cents: int, currency: str, metadata: dict) -> PaymentIntentResult:
        ...

    @abc.abstractmethod
    def verify_webhook(self, payload: bytes, sig_header: str) -> WebhookEvent:
        ...
