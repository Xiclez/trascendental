import type { MerchStatus } from "@/content/trascendental";
import { db } from "@/lib/server/db";

export type AdminOrder = {
  id: string;
  source: "stripe" | "courtesy";
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  amount_total: number;
  note: string | null;
  created_at: Date;
  paid_at: Date | null;
  email_sent_at: Date | null;
  email_error: string | null;
  whatsapp_sent_at: Date | null;
  whatsapp_error: string | null;
  lines: { kind: string; item_id: string; quantity: number; model: string | null; color: string | null; fit: string | null; size: string | null }[];
  codes: string[] | null;
};

/** Latest orders (paid first-class; pending/expired kept for auditing). `q` matches name, email, phone or ticket code. */
export async function listOrders({ q, source, limit = 100 }: { q?: string; source?: "stripe" | "courtesy"; limit?: number }) {
  const sql = db();
  const like = q ? `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%` : null;
  return sql<AdminOrder[]>`
    select o.id, o.source, o.status, o.customer_name, o.customer_email, o.customer_phone, o.amount_total, o.note,
      o.created_at, o.paid_at, o.email_sent_at, o.email_error, o.whatsapp_sent_at, o.whatsapp_error,
      coalesce((select json_agg(json_build_object('kind', l.kind, 'item_id', l.item_id, 'quantity', l.quantity, 'model', l.model, 'color', l.color, 'fit', l.fit, 'size', l.size))
                from order_lines l where l.order_id = o.id), '[]') as lines,
      (select array_agg(t.code order by t.code) from tickets t where t.order_id = o.id) as codes
    from orders o
    where true
      ${source ? sql`and o.source = ${source}` : sql``}
      ${
        like
          ? sql`and (o.customer_name ilike ${like} or o.customer_email ilike ${like} or o.customer_phone ilike ${like}
                 or exists (select 1 from tickets t where t.order_id = o.id and t.code ilike ${like}))`
          : sql``
      }
    order by o.created_at desc
    limit ${limit}`;
}

export async function orderCounts() {
  const [r] = await db()<{ paid: number; pending: number; email_failed: number; wa_failed: number; fees: number }[]>`
    select
      count(*) filter (where status = 'paid' and source = 'stripe')::int as paid,
      coalesce(sum(service_fee) filter (where status = 'paid'), 0)::int as fees,
      count(*) filter (where status = 'pending' and expires_at > now())::int as pending,
      count(*) filter (where status = 'paid' and email_error is not null and email_sent_at is null)::int as email_failed,
      count(*) filter (where status = 'paid' and whatsapp_error is not null and whatsapp_sent_at is null)::int as wa_failed
    from orders`;
  return r;
}

/* ------------------------------------------------------------------ merch */

export type MerchLine = {
  item_id: string;
  quantity: number;
  unit_price: number;
  model: string | null;
  color: string | null;
  fit: string | null;
  size: string | null;
};

export type MerchOrder = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  paid_at: Date | null;
  shipping: {
    name: string | null;
    address: {
      line1: string | null;
      line2: string | null;
      postal_code: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
    } | null;
  } | null;
  merch_status: MerchStatus;
  merch_tracking: string | null;
  merch_notified_at: Date | null;
  merch_notify_error: string | null;
  merch_confirmed_at: Date | null;
  merch_confirm_error: string | null;
  lines: MerchLine[];
};

/** Paid orders with merch (voided orders drop out). `q` matches name, email, phone or order ref. */
export async function listMerchOrders({ q, status }: { q?: string; status?: MerchStatus }) {
  const sql = db();
  const like = q ? `%${q.replace(/^#/, "").replace(/[%_\\]/g, (c) => `\\${c}`)}%` : null;
  return sql<MerchOrder[]>`
    select o.id, o.customer_name, o.customer_email, o.customer_phone, o.paid_at, o.shipping,
      o.merch_status, o.merch_tracking, o.merch_notified_at, o.merch_notify_error, o.merch_confirmed_at, o.merch_confirm_error,
      coalesce((select json_agg(json_build_object('item_id', l.item_id, 'quantity', l.quantity, 'unit_price', l.unit_price,
                  'model', l.model, 'color', l.color, 'fit', l.fit, 'size', l.size) order by l.id)
                from order_lines l where l.order_id = o.id and l.kind = 'product'), '[]') as lines
    from orders o
    where o.status = 'paid' and o.merch_status is not null
      ${status ? sql`and o.merch_status = ${status}` : sql``}
      ${
        like
          ? sql`and (o.customer_name ilike ${like} or o.customer_email ilike ${like} or o.customer_phone ilike ${like}
                 or o.id::text ilike ${like})`
          : sql``
      }
    order by o.paid_at desc nulls last
    limit 300`;
}

/** Garments to produce: units per product × design × colour × cut × size, plus orders per status. */
export async function merchSummary() {
  const sql = db();
  const [variants, statuses] = await Promise.all([
    sql<(Omit<MerchLine, "unit_price"> & { revenue: number })[]>`
      select l.item_id, l.model, l.color, l.fit, l.size, sum(l.quantity)::int as quantity,
        sum(l.quantity * l.unit_price)::int as revenue
      from order_lines l join orders o on o.id = l.order_id
      where l.kind = 'product' and o.status = 'paid'
      group by l.item_id, l.model, l.color, l.fit, l.size
      order by l.item_id, l.model nulls first, l.color nulls first, l.fit nulls first, l.size nulls first`,
    sql<{ merch_status: MerchStatus; orders: number; notify_failed: number }[]>`
      select merch_status, count(*)::int as orders,
        count(*) filter (where merch_notified_at is null and merch_notify_error is not null)::int as notify_failed
      from orders where status = 'paid' and merch_status is not null
      group by merch_status`,
  ]);
  return { variants, statuses };
}
