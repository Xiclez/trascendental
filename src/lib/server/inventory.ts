import type { Sql, TransactionSql } from "postgres";
import { lowStockPct, purchasable, tickets, type Availability, type LiveTier, type TicketTier } from "@/content/trascendental";
import { db, dbConfigured } from "@/lib/server/db";
import { REAL_DISPLAY, salesDisplay, type SalesDisplay } from "@/lib/server/sales-display";

/**
 * Ticket inventory per phase. A phase's capacity is consumed by paid orders plus
 * checkouts still in progress (pending, not expired). Courtesies never consume it.
 */

export type TierStats = {
  tierId: string;
  sold: number;
  reserved: number;
  courtesy: number;
  revenue: number; // pesos
  checkedIn: number;
};

type Q = Sql | TransactionSql;

export async function tierStats(sql: Q = db()): Promise<Map<string, TierStats>> {
  const rows = await sql<{ tier_id: string; sold: number; reserved: number; courtesy: number; revenue: number }[]>`
    select l.item_id as tier_id,
      coalesce(sum(l.quantity) filter (where o.source = 'stripe' and o.status = 'paid'), 0)::int as sold,
      coalesce(sum(l.quantity) filter (where o.source = 'stripe' and o.status = 'pending' and o.expires_at > now()), 0)::int as reserved,
      coalesce(sum(l.quantity) filter (where o.source = 'courtesy' and o.status = 'paid'), 0)::int as courtesy,
      coalesce(sum(l.quantity * l.unit_price) filter (where o.source = 'stripe' and o.status = 'paid'), 0)::int as revenue
    from order_lines l
    join orders o on o.id = l.order_id
    where l.kind = 'ticket'
    group by l.item_id`;
  const checked = await sql<{ tier_id: string; n: number }[]>`
    select tier_id, count(*)::int as n from tickets
    where status = 'valid' and checked_in_at is not null
    group by tier_id`;

  const map = new Map<string, TierStats>();
  for (const t of tickets) map.set(t.id, { tierId: t.id, sold: 0, reserved: 0, courtesy: 0, revenue: 0, checkedIn: 0 });
  for (const r of rows) {
    const s = map.get(r.tier_id);
    if (s) Object.assign(s, { sold: r.sold, reserved: r.reserved, courtesy: r.courtesy, revenue: r.revenue });
  }
  for (const r of checked) {
    const s = map.get(r.tier_id);
    if (s) s.checkedIn = r.n;
  }
  return map;
}

export const remainingOf = (tier: TicketTier, s: TierStats | undefined) =>
  tier.capacity == null ? null : Math.max(0, tier.capacity - (s?.sold ?? 0) - (s?.reserved ?? 0));

type Stats = Map<string, TierStats>;

/**
 * Live state of a tier. Sequential phases: a tier with `opensAfter` stays "upcoming"
 * until the previous one is sold out (or its window closed).
 * With the marketing display on, a phase marked sold out closes for real and a custom
 * % drives "Pocos lugares"; pass REAL_DISPLAY (default) for the true state.
 */
export function availabilityOf(tier: TicketTier, stats: Stats, display: SalesDisplay = REAL_DISPLAY, now = Date.now()): Availability {
  if (tier.availability === "soldout" || tier.availability === "closed") return tier.availability;
  if (tier.salesEndAt && now >= Date.parse(tier.salesEndAt)) return "closed";
  const custom = display.enabled ? display.tiers[tier.id] : undefined;
  if (custom?.soldout) return "soldout";
  if (tier.opensAfter) {
    const prev = tickets.find((t) => t.id === tier.opensAfter);
    const prevState = prev ? availabilityOf(prev, stats, display, now) : "soldout";
    if (prevState !== "soldout" && prevState !== "closed") return "upcoming";
  }
  const remaining = remainingOf(tier, stats.get(tier.id));
  if (remaining != null && remaining <= 0) return "soldout";
  const pct = custom?.pct ?? soldPctOf(tier, stats.get(tier.id));
  if (pct == null) return tier.availability;
  return pct >= lowStockPct ? "low" : "available";
}

/** Rounded sold percentage (paid + in checkout). Never shows 100% while tickets remain. */
export function soldPctOf(tier: TicketTier, s: TierStats | undefined) {
  if (!tier.capacity) return null;
  const used = (s?.sold ?? 0) + (s?.reserved ?? 0);
  const pct = Math.floor((used / tier.capacity) * 100);
  return used < tier.capacity ? Math.min(99, pct) : 100;
}

/** What the public sees for a tier: real stats, or the marketing display when it's on. */
export function publicTier(tier: TicketTier, stats: Stats, display: SalesDisplay = REAL_DISPLAY): LiveTier {
  const availability = availabilityOf(tier, stats, display);
  const custom = display.enabled ? display.tiers[tier.id] : undefined;
  const soldPct = availability === "soldout" ? (tier.capacity || custom ? 100 : null) : (custom?.pct ?? soldPctOf(tier, stats.get(tier.id)));
  return { ...tier, availability, soldPct };
}

const withoutDb = (): LiveTier[] => tickets.map((t) => publicTier(t, new Map()));

/** Content tiers merged with live stock. Falls back to the static content if the DB is down. */
export async function liveTiers(): Promise<LiveTier[]> {
  if (!dbConfigured()) return withoutDb();
  try {
    const [stats, display] = await Promise.all([tierStats(), salesDisplay()]);
    return tickets.map((t) => publicTier(t, stats, display));
  } catch (err) {
    console.error("[inventory]", err);
    return withoutDb();
  }
}

export class SoldOutError extends Error {}

const blockedMessage: Partial<Record<Availability, string>> = {
  soldout: "está agotado",
  upcoming: "aún no está a la venta",
  closed: "ya cerró su venta",
};

/**
 * Inside a transaction: serialises all reservations with an advisory lock, then
 * checks every tier in the request is on sale and still has room.
 * Messages never reveal exact counts.
 */
export async function assertStock(tx: TransactionSql, wanted: Map<string, number>) {
  await tx`select pg_advisory_xact_lock(4026)`;
  const [stats, display] = await Promise.all([tierStats(tx), salesDisplay(tx)]);
  for (const [tierId, qty] of wanted) {
    const tier = tickets.find((t) => t.id === tierId);
    if (!tier) continue;
    const state = availabilityOf(tier, stats, display);
    if (!purchasable(state)) throw new SoldOutError(`${tier.name} · ${tier.phase} ${blockedMessage[state] ?? "no está disponible"}.`);
    const remaining = remainingOf(tier, stats.get(tierId));
    if (remaining != null && qty > remaining) {
      throw new SoldOutError(`No quedan suficientes boletos ${tier.name} · ${tier.phase} para esa cantidad. Prueba con menos.`);
    }
  }
}
