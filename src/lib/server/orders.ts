import { randomInt } from "node:crypto";
import Stripe from "stripe";
import type { TransactionSql } from "postgres";
import { tickets as tiers } from "@/content/trascendental";
import { db } from "@/lib/server/db";
import { assertStock } from "@/lib/server/inventory";

/**
 * Order lifecycle (Stripe):
 *   checkout POST → pending order (reserves stock until expires_at) → Stripe Checkout
 *   webhook checkout.session.completed / success page → fulfillCheckoutSession → paid + tickets
 *   webhook checkout.session.expired → expired (stock released)
 * Courtesies are created already paid, with amount 0 and source 'courtesy'.
 */

export type OrderLine = {
  kind: "ticket" | "product";
  id: string;
  quantity: number;
  unitPrice: number;
  model?: string;
  color?: string;
  size?: string;
};

/** Stripe's minimum session lifetime is 30 min; the DB hold outlives it a little. */
export const CHECKOUT_TTL_MIN = 30;
const HOLD_MIN = CHECKOUT_TTL_MIN + 5;

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L
export function ticketCode() {
  const c = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `IV-${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
}

const ticketDemand = (lines: OrderLine[]) => {
  const m = new Map<string, number>();
  for (const l of lines) if (l.kind === "ticket") m.set(l.id, (m.get(l.id) ?? 0) + l.quantity);
  return m;
};

async function insertLines(tx: TransactionSql, orderId: string, lines: OrderLine[]) {
  const rows = lines.map((l) => ({
    order_id: orderId,
    kind: l.kind,
    item_id: l.id,
    quantity: l.quantity,
    unit_price: l.unitPrice,
    model: l.model ?? null,
    color: l.color ?? null,
    size: l.size ?? null,
  }));
  await tx`insert into order_lines ${tx(rows, "order_id", "kind", "item_id", "quantity", "unit_price", "model", "color", "size")}`;
}

async function issueTickets(tx: TransactionSql, orderId: string, holder: string | null, courtesy: boolean) {
  const lines = await tx<{ item_id: string; quantity: number }[]>`
    select item_id, quantity from order_lines where order_id = ${orderId} and kind = 'ticket'`;
  const rows = lines.flatMap((l) =>
    Array.from({ length: l.quantity }, () => ({
      code: ticketCode(),
      order_id: orderId,
      tier_id: l.item_id,
      holder_name: holder,
      courtesy,
    })),
  );
  if (rows.length) await tx`insert into tickets ${tx(rows, "code", "order_id", "tier_id", "holder_name", "courtesy")}`;
  return rows.length;
}

/**
 * Reserves stock and records the order before sending the buyer to Stripe. Throws SoldOutError.
 * `fee` (pesos) is the service charge on top of the lines; amount_total includes it.
 */
export async function createPendingOrder(lines: OrderLine[], fee: number) {
  const amount = (lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0) + fee) * 100;
  return db().begin(async (tx) => {
    await assertStock(tx, ticketDemand(lines));
    const [order] = await tx<{ id: string }[]>`
      insert into orders (source, status, amount_total, service_fee, expires_at)
      values ('stripe', 'pending', ${amount}, ${fee * 100}, now() + make_interval(mins => ${HOLD_MIN}))
      returning id`;
    await insertLines(tx, order.id, lines);
    return order.id;
  });
}

export async function attachSession(orderId: string, sessionId: string) {
  await db()`update orders set stripe_session_id = ${sessionId} where id = ${orderId}`;
}

export async function cancelOrder(orderId: string) {
  await db()`update orders set status = 'canceled' where id = ${orderId} and status = 'pending'`;
}

/**
 * Admin "Anular": a paid order (sale or courtesy) stops counting — its tickets are voided
 * (the scanner rejects them) and its stock is released. Does NOT refund in Stripe.
 */
export async function voidPaidOrder(orderId: string) {
  return db().begin(async (tx) => {
    const [order] = await tx<{ id: string }[]>`
      update orders set status = 'canceled' where id = ${orderId} and status = 'paid' returning id`;
    if (!order) return false;
    await tx`update tickets set status = 'void' where order_id = ${orderId}`;
    return true;
  });
}

export async function expireSession(sessionId: string) {
  await db()`update orders set status = 'expired' where stripe_session_id = ${sessionId} and status = 'pending'`;
}

let stripeClient: Stripe | null = null;
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY no configurada");
  stripeClient ??= new Stripe(key);
  return stripeClient;
}

/**
 * Idempotent: safe to call from the webhook and the success page for the same session.
 * Always re-reads the session from Stripe. Returns the order id only when THIS call
 * issued the tickets — the caller then triggers delivery exactly once.
 */
export async function fulfillCheckoutSession(sessionId: string): Promise<{ issuedOrderId: string | null; paid: boolean }> {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
  const orderId = session.client_reference_id ?? session.metadata?.order_id;
  if (!paid || !orderId) return { issuedOrderId: null, paid };

  const d = session.customer_details;
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);

  const issued = await db().begin(async (tx) => {
    const [order] = await tx<{ id: string }[]>`
      update orders set
        status = 'paid', paid_at = now(),
        stripe_session_id = ${session.id},
        stripe_payment_intent = ${intent},
        customer_name = ${d?.name ?? null},
        customer_email = ${d?.email ?? null},
        customer_phone = ${d?.phone ?? null},
        amount_total = ${session.amount_total ?? 0}
      where id = ${orderId} and source = 'stripe' and status <> 'paid'
      returning id`;
    if (!order) return false;
    await issueTickets(tx, order.id, d?.name ?? null, false);
    return true;
  });
  return { issuedOrderId: issued ? orderId : null, paid };
}

export type CourtesyInput = {
  name: string;
  email: string | null;
  phone: string | null;
  tierId: string;
  quantity: number;
  note: string | null;
};

export async function createCourtesy(input: CourtesyInput) {
  const tier = tiers.find((t) => t.id === input.tierId);
  if (!tier) throw new Error("Tipo de acceso inválido");
  return db().begin(async (tx) => {
    const [order] = await tx<{ id: string }[]>`
      insert into orders (source, status, customer_name, customer_email, customer_phone, note, paid_at)
      values ('courtesy', 'paid', ${input.name}, ${input.email}, ${input.phone}, ${input.note}, now())
      returning id`;
    await insertLines(tx, order.id, [{ kind: "ticket", id: tier.id, quantity: input.quantity, unitPrice: 0 }]);
    await issueTickets(tx, order.id, input.name, true);
    return order.id;
  });
}

export type TicketView = {
  code: string;
  tier_id: string;
  holder_name: string | null;
  courtesy: boolean;
  status: "valid" | "void";
  checked_in_at: Date | null;
  checked_in_by: string | null;
  order_status: string;
};

export async function findTicket(code: string) {
  const [t] = await db()<TicketView[]>`
    select t.code, t.tier_id, t.holder_name, t.courtesy, t.status, t.checked_in_at, t.checked_in_by, o.status as order_status
    from tickets t join orders o on o.id = t.order_id
    where t.code = ${code.toUpperCase()}`;
  return t ?? null;
}

export type CheckInResult =
  | { ok: true; ticket: TicketView }
  | { ok: false; kind: "notfound"; reason: string }
  | { ok: false; kind: "used" | "invalid"; reason: string; ticket: TicketView };

/**
 * Marks a ticket as used (atomic: two doors scanning the same QR can't both let it in).
 * `by` is the staff username, kept for auditing.
 */
export async function checkIn(code: string, by: string): Promise<CheckInResult> {
  const sql = db();
  const [done] = await sql<{ code: string }[]>`
    update tickets t set checked_in_at = now(), checked_in_by = ${by}
    from orders o
    where t.code = ${code.toUpperCase()} and o.id = t.order_id
      and t.status = 'valid' and o.status = 'paid' and t.checked_in_at is null
    returning t.code`;
  const t = await findTicket(code);
  if (!t) return { ok: false, kind: "notfound", reason: "Boleto no encontrado" };
  if (done) return { ok: true, ticket: t };
  if (t.checked_in_at)
    return {
      ok: false,
      kind: "used",
      ticket: t,
      reason: `Ya ingresó: ${t.checked_in_at.toLocaleString("es-MX", { timeZone: "America/Chihuahua" })}${t.checked_in_by ? ` · ${t.checked_in_by}` : ""}`,
    };
  return { ok: false, kind: "invalid", ticket: t, reason: "Boleto no válido (cancelado o sin pago)" };
}
