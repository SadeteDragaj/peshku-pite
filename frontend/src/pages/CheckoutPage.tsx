/* Checkout page – uses Stripe Elements to confirm a card payment. */

import { useState, useEffect, FormEvent } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { api } from "../lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PaymentIntentData {
  payment_id: string;
  client_secret: string;
  stripe_publishable_key: string;
  amount: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// Inner form (must be inside <Elements>)
// ---------------------------------------------------------------------------
function CheckoutForm({ clientSecret, amount, currency }: {
  clientSecret: string;
  amount: number;
  currency: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const card = elements.getElement(CardElement);
    if (!card) return;

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed");
      setProcessing(false);
    } else if (paymentIntent?.status === "succeeded") {
      setSucceeded(true);
      setProcessing(false);
    }
  };

  if (succeeded) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-green-50 rounded-lg text-center">
        <h2 className="text-2xl font-bold text-green-700">Payment Successful!</h2>
        <p className="mt-2 text-green-600">
          {currency.toUpperCase()} {amount.toFixed(2)} has been charged.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-12 p-6 bg-white shadow rounded-lg space-y-6">
      <h2 className="text-xl font-semibold">
        Pay {currency.toUpperCase()} {amount.toFixed(2)}
      </h2>

      <div className="border rounded p-3">
        <CardElement options={{
          style: {
            base: { fontSize: "16px", color: "#32325d" },
            invalid: { color: "#fa755a" },
          },
        }} />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-2 px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {processing ? "Processing…" : "Pay Now"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main Checkout page
// ---------------------------------------------------------------------------
export default function CheckoutPage() {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [intentData, setIntentData] = useState<PaymentIntentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read order_id from URL search params
  const orderId = new URLSearchParams(window.location.search).get("order_id");

  useEffect(() => {
    if (!orderId) {
      setError("Missing order_id in URL");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await api.post<PaymentIntentData>("/payments/create-intent", {
          order_id: orderId,
        });
        setIntentData(data);
        setStripePromise(loadStripe(data.stripe_publishable_key));
      } catch (err: any) {
        setError(err.message ?? "Failed to create payment intent");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (loading) return <p className="text-center mt-12">Creating payment…</p>;
  if (error) return <p className="text-center mt-12 text-red-600">{error}</p>;
  if (!intentData || !stripePromise) return null;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: intentData.client_secret }}>
      <CheckoutForm
        clientSecret={intentData.client_secret}
        amount={intentData.amount}
        currency={intentData.currency}
      />
    </Elements>
  );
}
