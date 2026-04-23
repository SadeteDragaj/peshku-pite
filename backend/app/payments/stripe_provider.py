"""Stripe implementation of the PaymentProvider interface."""

from __future__ import annotations

import stripe

from app.core.config import settings
from app.payments import PaymentIntentResult, PaymentProvider, WebhookEvent


class StripeProvider(PaymentProvider):
    def __init__(self) -> None:
        stripe.api_key = settings.STRIPE_SECRET_KEY

    async def create_intent(
        self, amount_cents: int, currency: str, metadata: dict
    ) -> PaymentIntentResult:
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency,
            metadata=metadata,
            automatic_payment_methods={"enabled": True},
        )
        return PaymentIntentResult(
            provider_intent_id=intent.id,
            client_secret=intent.client_secret,
            amount=intent.amount,
            currency=intent.currency,
        )

    def verify_webhook(self, payload: bytes, sig_header: str) -> WebhookEvent:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
        intent = event["data"]["object"]
        event_type = event["type"]

        status_map = {
            "payment_intent.succeeded": "succeeded",
            "payment_intent.payment_failed": "failed",
        }
        return WebhookEvent(
            event_type=event_type,
            intent_id=intent["id"],
            status=status_map.get(event_type, "pending"),
        )


def get_payment_provider() -> PaymentProvider:
    """Factory – swap this return to change providers."""
    return StripeProvider()
