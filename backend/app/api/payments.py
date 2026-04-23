"""Payment endpoints – create-intent and Stripe webhook."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.order import Order
from app.models.payment import Payment, PaymentStatus
from app.models.user import User
from app.payments.stripe_provider import get_payment_provider
from app.schemas.payment import CreatePaymentIntentRequest, PaymentIntentResponse, PaymentRead
from app.core.config import settings

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /payments/create-intent
# ---------------------------------------------------------------------------
@router.post("/create-intent", response_model=PaymentIntentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_intent(
    body: CreatePaymentIntentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Fetch order
    result = await db.execute(select(Order).where(Order.id == body.order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Calculate total from order items (already stored as subtotals)
    total_cents = int(round(sum(item.subtotal for item in order.items) * 100))
    if total_cents <= 0:
        raise HTTPException(status_code=400, detail="Order total must be positive")

    # Check for existing pending payment
    existing = await db.execute(
        select(Payment).where(Payment.order_id == body.order_id, Payment.status == PaymentStatus.PENDING)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Payment already initiated for this order")

    provider = get_payment_provider()
    intent = await provider.create_intent(
        amount_cents=total_cents,
        currency=body.currency,
        metadata={"order_id": body.order_id, "user_id": current_user.id},
    )

    payment = Payment(
        order_id=body.order_id,
        stripe_payment_intent_id=intent.provider_intent_id,
        amount=total_cents / 100,
        currency=body.currency,
        status=PaymentStatus.PENDING,
        stripe_client_secret=intent.client_secret,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    return PaymentIntentResponse(
        payment_id=payment.id,
        client_secret=intent.client_secret,
        stripe_publishable_key=settings.STRIPE_PUBLISHABLE_KEY,
        amount=payment.amount,
        currency=payment.currency,
    )


# ---------------------------------------------------------------------------
# POST /payments/webhook  (no auth – verified by Stripe signature)
# ---------------------------------------------------------------------------
@router.post("/webhook", status_code=200)
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    provider = get_payment_provider()
    try:
        event = provider.verify_webhook(payload, sig_header)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    # Update payment record
    result = await db.execute(
        select(Payment).where(Payment.stripe_payment_intent_id == event.intent_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        return {"status": "ignored"}

    payment.status = event.status
    await db.commit()

    return {"status": "ok", "payment_status": event.status}


# ---------------------------------------------------------------------------
# GET /payments/{order_id}  – check payment status
# ---------------------------------------------------------------------------
@router.get("/{order_id}", response_model=PaymentRead)
async def get_payment(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Payment).where(Payment.order_id == order_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="No payment found for this order")
    return payment
