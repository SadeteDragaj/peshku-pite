"""Pydantic schemas for payments."""

from datetime import datetime

from pydantic import BaseModel, Field


class CreatePaymentIntentRequest(BaseModel):
    order_id: str
    currency: str = Field(default="usd", max_length=3)


class PaymentIntentResponse(BaseModel):
    payment_id: str
    client_secret: str
    stripe_publishable_key: str
    amount: float
    currency: str


class PaymentRead(BaseModel):
    id: str
    order_id: str
    stripe_payment_intent_id: str
    amount: float
    currency: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
