import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { ClearCart } from "@/components/clear-cart";
import { event, formatPrice } from "@/content/trascendental";
import { dbConfigured } from "@/lib/server/db";
import { deliverOrder } from "@/lib/server/notify";
import { fulfillCheckoutSession, stripe } from "@/lib/server/orders";

export const metadata: Metadata = { title: "Compra confirmada", robots: { index: false } };

async function getSession(id: string | undefined) {
  if (!id || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    return await stripe().checkout.sessions.retrieve(id);
  } catch {
    return null;
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const session = await getSession(session_id);
  const paid = session?.payment_status === "paid";

  // Fulfil here too (idempotent with the webhook) so tickets don't wait on webhook latency.
  if (session && paid && dbConfigured()) {
    try {
      const { issuedOrderId } = await fulfillCheckoutSession(session.id);
      if (issuedOrderId) after(() => deliverOrder(issuedOrderId));
    } catch (err) {
      console.error("[success:fulfill]", err);
    }
  }

  const email = session?.customer_details?.email;
  const phone = session?.customer_details?.phone;

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-3xl flex-col justify-center px-5 py-24 sm:px-8">
      <ClearCart />
      <p className="label text-[11px] text-ink">
        {event.title} {event.edition} · {event.dateLabel}
      </p>
      <h1 className="display mt-4 text-[clamp(3rem,10vw,7rem)] text-ink">{paid || !session ? "Nos vemos en la pista" : "Pago en proceso"}</h1>
      <p className="mt-6 max-w-xl text-graphite">
        {paid
          ? `Tus boletos con código QR van en camino${email ? ` a ${email}` : " a tu correo"}${phone ? ` y por WhatsApp al ${phone}` : ""}. Un QR por persona: preséntalo en la entrada con identificación oficial.`
          : "En cuanto se confirme tu pago recibirás tus boletos con código QR por correo y WhatsApp."}
      </p>
      {session?.amount_total != null ? (
        <p className="display mt-8 text-4xl tabular-nums">{formatPrice(session.amount_total / 100)}</p>
      ) : null}
      <Link
        href="/"
        className="label mt-12 inline-flex min-h-12 w-fit items-center bg-ink px-8 text-[12px] text-paper hover:bg-ink/80"
      >
        Volver al sitio
      </Link>
    </main>
  );
}
