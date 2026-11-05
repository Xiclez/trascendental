import { after } from "next/server";
import { deliverOrder } from "@/lib/server/notify";
import { expireSession, fulfillCheckoutSession, stripe } from "@/lib/server/orders";

/**
 * POST /api/stripe/webhook — Stripe → server. Source of truth for fulfilment.
 * Dashboard events: checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.expired. Local: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Webhook no configurado", { status: 400 });

  const payload = await request.text();
  let evt;
  try {
    evt = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error("[webhook] firma inválida", err);
    return new Response("Firma inválida", { status: 400 });
  }

  try {
    switch (evt.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const { issuedOrderId } = await fulfillCheckoutSession(evt.data.object.id);
        // Respond to Stripe first; SMTP + WhatsApp can take several seconds.
        if (issuedOrderId) after(() => deliverOrder(issuedOrderId));
        break;
      }
      case "checkout.session.expired":
        await expireSession(evt.data.object.id);
        break;
    }
  } catch (err) {
    console.error("[webhook]", evt.type, err);
    return new Response("Error procesando evento", { status: 500 }); // Stripe retries
  }
  return Response.json({ received: true });
}
