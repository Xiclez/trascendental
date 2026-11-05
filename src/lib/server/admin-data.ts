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
  lines: { kind: string; item_id: string; quantity: number; color: string | null; size: string | null }[];
  codes: string[] | null;
};

/** Latest orders (paid first-class; pending/expired kept for auditing). `q` matches name, email, phone or ticket code. */
export async function listOrders({ q, source, limit = 100 }: { q?: string; source?: "stripe" | "courtesy"; limit?: number }) {
  const sql = db();
  const like = q ? `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%` : null;
  return sql<AdminOrder[]>`
    select o.id, o.source, o.status, o.customer_name, o.customer_email, o.customer_phone, o.amount_total, o.note,
      o.created_at, o.paid_at, o.email_sent_at, o.email_error, o.whatsapp_sent_at, o.whatsapp_error,
      coalesce((select json_agg(json_build_object('kind', l.kind, 'item_id', l.item_id, 'quantity', l.quantity, 'color', l.color, 'size', l.size))
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
