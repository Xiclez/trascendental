import type { Sql, TransactionSql } from "postgres";
import { tickets } from "@/content/trascendental";
import { db } from "@/lib/server/db";

/**
 * "Custom sale percentage" (marketing). While enabled, the public site shows a fixed
 * sold % per phase and phases marked `soldout` close for real (the next phase opens).
 * Disabled = real stats; the saved values are kept for the next time it's turned on.
 * Exact counts in /admin are always the real ones.
 */

export type TierDisplay = { pct: number | null; soldout: boolean };
export type SalesDisplay = { enabled: boolean; tiers: Record<string, TierDisplay> };

export const REAL_DISPLAY: SalesDisplay = { enabled: false, tiers: {} };

const KEY = "sales_display";
type Q = Sql | TransactionSql;

/** 0–99: 100% is only reachable by marking the phase sold out. */
export const clampPct = (n: number) => Math.max(0, Math.min(99, Math.round(n)));

function parse(raw: unknown): SalesDisplay {
  const v = (raw ?? {}) as Partial<SalesDisplay>;
  const tiers: Record<string, TierDisplay> = {};
  for (const t of tickets) {
    const d = v.tiers?.[t.id];
    tiers[t.id] = {
      pct: typeof d?.pct === "number" && Number.isFinite(d.pct) ? clampPct(d.pct) : null,
      soldout: d?.soldout === true,
    };
  }
  return { enabled: v.enabled === true, tiers };
}

export async function salesDisplay(sql: Q = db()): Promise<SalesDisplay> {
  const [row] = await sql<{ value: unknown }[]>`select value from settings where key = ${KEY}`;
  return parse(row?.value);
}

export async function saveSalesDisplay(next: SalesDisplay) {
  const value = parse(next);
  await db()`
    insert into settings (key, value) values (${KEY}, ${db().json(value)})
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
}
