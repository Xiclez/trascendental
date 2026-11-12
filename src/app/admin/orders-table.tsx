import Link from "next/link";
import { resend, voidOrder } from "@/app/admin/actions";
import { formatPrice, merchVariant, products, tickets } from "@/content/trascendental";
import type { AdminOrder } from "@/lib/server/admin-data";

const tz = "America/Chihuahua";
export const fmtDate = (d: Date | null) =>
  d ? d.toLocaleString("es-MX", { timeZone: tz, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const statusLabel: Record<string, string> = {
  paid: "Pagado",
  pending: "En checkout",
  expired: "Expirado",
  canceled: "Cancelado / anulado",
  refunded: "Reembolsado",
};

function lineName(l: AdminOrder["lines"][number]) {
  if (l.kind === "ticket") {
    const t = tickets.find((x) => x.id === l.item_id);
    return t ? `${t.name} · ${t.phase}` : l.item_id;
  }
  const p = products.find((x) => x.id === l.item_id);
  return [p?.name ?? l.item_id, merchVariant(p, l)].filter(Boolean).join(" · ");
}

function Delivery({ order, channel }: { order: AdminOrder; channel: "email" | "whatsapp" }) {
  const target = channel === "email" ? order.customer_email : order.customer_phone;
  const sent = channel === "email" ? order.email_sent_at : order.whatsapp_sent_at;
  const error = channel === "email" ? order.email_error : order.whatsapp_error;
  if (!target) return <span className="text-smoke">—</span>;
  return (
    <div className="flex flex-col gap-1">
      <span className="break-all">{target}</span>
      {order.status === "paid" ? (
        <span className="flex flex-wrap items-center gap-2">
          {sent ? (
            <span className="label text-[9px] text-graphite">Enviado {fmtDate(sent)}</span>
          ) : error ? (
            <span className="label text-[9px] text-ink" title={error}>
              <span aria-hidden className="mr-1 inline-block size-1.5 rounded-full bg-[var(--accent)] align-middle" />
              Falló
            </span>
          ) : (
            <span className="label text-[9px] text-graphite">Pendiente</span>
          )}
          <form action={resend}>
            <input type="hidden" name="order" value={order.id} />
            <input type="hidden" name="channel" value={channel} />
            <button type="submit" className="label min-h-8 border border-rule px-2 text-[9px] text-ink hover:border-ink">
              Reenviar
            </button>
          </form>
        </span>
      ) : null}
    </div>
  );
}

export function OrdersTable({ orders, empty }: { orders: AdminOrder[]; empty: string }) {
  if (!orders.length) return <p className="border border-rule bg-card/60 p-6 text-sm text-graphite">{empty}</p>;
  return (
    <div className="overflow-x-auto border border-rule bg-card/60">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead>
          <tr className="label border-b border-rule text-[10px] text-graphite">
            <th className="p-3 font-normal">Fecha</th>
            <th className="p-3 font-normal">Comprador</th>
            <th className="p-3 font-normal">Detalle</th>
            <th className="p-3 font-normal">Total</th>
            <th className="p-3 font-normal">Estado</th>
            <th className="p-3 font-normal">Correo</th>
            <th className="p-3 font-normal">WhatsApp</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule align-top">
          {orders.map((o) => (
            <tr key={o.id} className={o.status === "paid" ? "" : "text-graphite"}>
              <td className="whitespace-nowrap p-3 tabular-nums">{fmtDate(o.paid_at ?? o.created_at)}</td>
              <td className="p-3">
                <span className="text-ink">{o.customer_name ?? "—"}</span>
                {o.source === "courtesy" ? <span className="label ml-2 border border-rule px-1 text-[9px]">Cortesía</span> : null}
                {o.note ? <p className="mt-1 text-xs text-graphite">{o.note}</p> : null}
              </td>
              <td className="p-3">
                <ul className="space-y-0.5">
                  {o.lines.map((l, i) => (
                    <li key={i}>
                      {l.quantity}× {lineName(l)}
                    </li>
                  ))}
                </ul>
                {o.codes?.length ? (
                  <p className="mt-2 flex flex-wrap gap-x-3 font-mono text-[11px]">
                    {o.codes.map((c) => (
                      <Link key={c} href={`/t/${c}`} className="underline decoration-rule underline-offset-2 hover:decoration-ink">
                        {c}
                      </Link>
                    ))}
                  </p>
                ) : null}
              </td>
              <td className="whitespace-nowrap p-3 tabular-nums">{formatPrice(o.amount_total / 100)}</td>
              <td className="p-3">
                <span className="whitespace-nowrap">{statusLabel[o.status] ?? o.status}</span>
                {o.status === "paid" ? (
                  // Two steps (no browser dialog): open, read what it does, confirm.
                  <details className="mt-2 text-xs">
                    <summary className="label inline-flex min-h-8 cursor-pointer list-none items-center border border-rule px-2 text-[9px] text-graphite hover:border-ink hover:text-ink">
                      Anular
                    </summary>
                    <div className="mt-2 w-56 border border-rule bg-paper p-3">
                      <p className="text-graphite">
                        Sus boletos dejan de servir en la entrada y se libera el cupo. No reembolsa en Stripe.
                      </p>
                      <form action={voidOrder} className="mt-2">
                        <input type="hidden" name="order" value={o.id} />
                        <button type="submit" className="label min-h-8 w-full bg-ink px-2 text-[9px] text-paper hover:bg-ink/80">
                          Confirmar anulación
                        </button>
                      </form>
                    </div>
                  </details>
                ) : null}
              </td>
              <td className="p-3 text-xs">
                <Delivery order={o} channel="email" />
              </td>
              <td className="p-3 text-xs">
                <Delivery order={o} channel="whatsapp" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
