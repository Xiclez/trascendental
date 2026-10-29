import Stripe from "stripe";
import { currency, event, products, tickets } from "@/content/trascendental";

/**
 * POST /api/checkout — creates a Stripe Checkout Session (test mode).
 * The client only sends ids + quantities; every name and price is resolved
 * here from src/content/trascendental.ts so the browser cannot set prices.
 */

type Item = { kind: "ticket" | "product"; id: string; quantity: number; color?: string; size?: string };

const MAX_QTY = 10;

function toLineItem(item: Item): Stripe.Checkout.SessionCreateParams.LineItem | string {
  const quantity = Math.floor(Number(item.quantity));
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QTY) return `Cantidad inválida para ${item.id}`;

  if (item.kind === "ticket") {
    const tier = tickets.find((t) => t.id === item.id);
    if (!tier) return `Ticket desconocido: ${item.id}`;
    if (tier.availability === "soldout") return `${tier.name} · ${tier.phase} está agotado`;
    return {
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
    };
  }

  const product = products.find((p) => p.id === item.id);
  if (!product || !product.available) return `Producto no disponible: ${item.id}`;
  const color = product.colors ? product.colors.find((c) => c.id === item.color) : undefined;
  if (product.colors && !color) return `Color inválido para ${product.name}`;
  if (product.sizes && product.sizes.length > 1 && !product.sizes.includes(item.size ?? "")) return `Talla inválida para ${product.name}`;
  const variant = [color?.name, item.size].filter(Boolean).join(" · ");
  return {
    quantity,
    price_data: {
      currency,
      unit_amount: product.price * 100,
      product_data: {
        name: variant ? `${product.name} — ${variant}` : product.name,
        metadata: { kind: "product", id: product.id, color: color?.id ?? "", size: item.size ?? "" },
      },
    },
  };
}

export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return Response.json(
      { error: "Pagos no configurados: falta STRIPE_SECRET_KEY en .env.local." },
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

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const item of items) {
    const result = toLineItem(item);
    if (typeof result === "string") return Response.json({ error: result }, { status: 400 });
    lineItems.push(result);
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const hasMerch = items.some((i) => i.kind === "product");

  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      locale: "es",
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      phone_number_collection: { enabled: true },
      ...(hasMerch ? { shipping_address_collection: { allowed_countries: ["MX"] } } : {}),
      metadata: {
        event: `${event.title} ${event.edition}`,
        items: JSON.stringify(items.map(({ kind, id, quantity, color, size }) => [kind, id, quantity, color ?? "", size ?? ""])).slice(0, 500),
      },
    });
    if (!session.url) throw new Error("Stripe no devolvió URL de checkout");
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    return Response.json({ error: "No se pudo crear la sesión de pago. Intenta de nuevo." }, { status: 502 });
  }
}
