import type Stripe from "stripe";
import { currency, event, products, serviceFee, site, tickets } from "@/content/trascendental";
import { withFee } from "@/lib/fees";
import { dbConfigured } from "@/lib/server/db";
import { SoldOutError } from "@/lib/server/inventory";
import {
  attachSession,
  cancelOrder,
  CHECKOUT_TTL_MIN,
  createPendingOrder,
  stripe,
  type OrderLine,
} from "@/lib/server/orders";

/**
 * POST /api/checkout — reserves stock in Postgres, then creates a Stripe Checkout Session.
 * The client only sends ids + quantities; every name and price is resolved
 * here from src/content/trascendental.ts so the browser cannot set prices.
 * Tickets (QR) are issued by the webhook / success page once Stripe confirms payment.
 * A "Cargo por servicio" line (src/lib/fees.ts) passes Stripe's fee to the buyer.
 */

type Item = { kind: "ticket" | "product"; id: string; quantity: number; color?: string; size?: string };

const MAX_QTY = 10;

type Resolved = { stripe: Stripe.Checkout.SessionCreateParams.LineItem; line: OrderLine };

function toLineItem(item: Item): Resolved | string {
  const quantity = Math.floor(Number(item.quantity));
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QTY) return `Cantidad inválida para ${item.id}`;

  if (item.kind === "ticket") {
    const tier = tickets.find((t) => t.id === item.id);
    if (!tier) return `Ticket desconocido: ${item.id}`;
    if (tier.availability === "soldout" || tier.availability === "closed") return `${tier.name} · ${tier.phase} no está disponible`;
    return {
      line: { kind: "ticket", id: tier.id, quantity, unitPrice: tier.price },
      stripe: {
        quantity,
        price_data: {
          currency,
          unit_amount: tier.price * 100,
          product_data: {
            name: `${event.title} ${event.edition} — ${tier.name} (${tier.phase})`,
            description: `${event.dateLong} · ${event.venue.city}`,
            metadata: { kind: "ticket", id: tier.id },
          },
        },
      },
    };
  }

  const product = products.find((p) => p.id === item.id);
  if (!product || !product.available) return `Producto no disponible: ${item.id}`;
  const color = product.colors ? product.colors.find((c) => c.id === item.color) : undefined;
  if (product.colors && !color) return `Color inválido para ${product.name}`;
  if (product.sizes && product.sizes.length > 1 && !product.sizes.includes(item.size ?? "")) return `Talla inválida para ${product.name}`;
  const variant = [color?.name, item.size].filter(Boolean).join(" · ");
  return {
    line: { kind: "product", id: product.id, quantity, unitPrice: product.price, color: color?.id, size: item.size },
    stripe: {
      quantity,
      price_data: {
        currency,
        unit_amount: product.price * 100,
        product_data: {
          name: variant ? `${product.name} — ${variant}` : product.name,
          metadata: { kind: "product", id: product.id, color: color?.id ?? "", size: item.size ?? "" },
        },
      },
    },
  };
}

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !dbConfigured()) {
    return Response.json(
      { error: "Pagos no configurados: faltan STRIPE_SECRET_KEY o DATABASE_URL." },
      { status: 503 },
    );
  }

  let items: Item[];
  try {
    const body = (await request.json()) as { items?: Item[] };
    items = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
  } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!items.length) return Response.json({ error: "El carrito está vacío." }, { status: 400 });

  const resolved: Resolved[] = [];
  for (const item of items) {
    const result = toLineItem(item);
    if (typeof result === "string") return Response.json({ error: result }, { status: 400 });
    resolved.push(result);
  }
  const ticketQty = resolved.reduce((n, r) => n + (r.line.kind === "ticket" ? r.line.quantity : 0), 0);
  if (ticketQty > MAX_QTY * 2) return Response.json({ error: "Demasiados tickets en una sola compra." }, { status: 400 });

  const lines = resolved.map((r) => r.line);
  const { fee } = withFee(lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0));

  let orderId: string;
  try {
    orderId = await createPendingOrder(lines, fee);
  } catch (err) {
    if (err instanceof SoldOutError) return Response.json({ error: err.message }, { status: 409 });
    console.error("[checkout:db]", err);
    return Response.json({ error: "No se pudo reservar tu compra. Intenta de nuevo." }, { status: 500 });
  }

  const origin = site.url;
  const hasMerch = items.some((i) => i.kind === "product");

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        ...resolved.map((r) => r.stripe),
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: fee * 100,
            product_data: { name: serviceFee.label, description: serviceFee.note, metadata: { kind: "fee" } },
          },
        },
      ],
      locale: "es",
      client_reference_id: orderId,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_MIN * 60,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      // Required: the QR tickets are delivered by email and WhatsApp.
      phone_number_collection: { enabled: true },
      ...(hasMerch ? { shipping_address_collection: { allowed_countries: ["MX"] } } : {}),
      payment_intent_data: { metadata: { order_id: orderId } },
      metadata: { order_id: orderId, event: `${event.title} ${event.edition}` },
    });
    if (!session.url) throw new Error("Stripe no devolvió URL de checkout");
    await attachSession(orderId, session.id);
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    await cancelOrder(orderId).catch(() => {});
    return Response.json({ error: "No se pudo crear la sesión de pago. Intenta de nuevo." }, { status: 502 });
  }
}
