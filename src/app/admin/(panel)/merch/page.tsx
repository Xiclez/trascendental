import Link from "next/link";
import { resendMerchConfirmation, resendMerchNotice, updateMerchOrder } from "@/app/admin/actions";
import { fmtDate } from "@/app/admin/orders-table";
import { btn, field } from "@/app/admin/styles";
import { formatPrice, merchOrders, products, type MerchStatus } from "@/content/trascendental";
import { listMerchOrders, merchSummary, type MerchLine, type MerchOrder } from "@/lib/server/admin-data";
import { formatShipping, orderRef } from "@/lib/server/notify";

const STATUSES = Object.keys(merchOrders.status) as MerchStatus[];

const product = (id: string) => products.find((p) => p.id === id);

/** Each variant spelled out with its label: the team reads this to pick the garment. */
function variantParts(l: Pick<MerchLine, "item_id" | "model" | "color" | "fit" | "size">) {
  const p = product(l.item_id);
  return [
    { label: "Diseño", value: p?.models?.find((m) => m.id === l.model)?.name ?? l.model },
    { label: "Color", value: p?.colors?.find((c) => c.id === l.color)?.name ?? l.color },
    { label: "Corte", value: p?.fits?.find((f) => f.id === l.fit)?.name ?? l.fit },
    { label: "Talla", value: l.size },
  ];
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-paper p-5">
      <dt className="label text-[10px] text-graphite">{label}</dt>
      <dd className="display mt-3 text-[clamp(1.8rem,4vw,2.8rem)] tabular-nums text-ink">{value}</dd>
      {note ? <dd className="mt-1 text-xs text-graphite">{note}</dd> : null}
    </div>
  );
}

/** Delivery state of one message + its resend button (team notice or buyer confirmation). */
function Notice({
  order,
  sentAt,
  error,
  action,
  label,
}: {
  order: MerchOrder;
  sentAt: Date | null;
  error: string | null;
  action: (fd: FormData) => Promise<void>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      {sentAt ? (
        <span className="label text-[9px] text-graphite">Enviado {fmtDate(sentAt)}</span>
      ) : error ? (
        <span className="label text-[9px] text-ink" title={error}>
          <span aria-hidden className="mr-1 inline-block size-1.5 rounded-full bg-[var(--accent)] align-middle" />
          Falló
        </span>
      ) : (
        <span className="label text-[9px] text-graphite">Pendiente</span>
      )}
      <form action={action}>
        <input type="hidden" name="order" value={order.id} />
        <button type="submit" className="label min-h-8 border border-rule px-2 text-[9px] text-ink hover:border-ink">
          {label}
        </button>
      </form>
    </div>
  );
}

function StatusForm({ order }: { order: MerchOrder }) {
  const id = `st-${order.id}`;
  return (
    <form action={updateMerchOrder} className="flex w-44 flex-col gap-2">
      <input type="hidden" name="order" value={order.id} />
      <label className="sr-only" htmlFor={id}>
        Estado del pedido {orderRef(order.id)}
      </label>
      <select id={id} name="status" defaultValue={order.merch_status} className={field.replace("mt-2 ", "")}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {merchOrders.status[s]}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`tr-${order.id}`}>
        Guía de envío
      </label>
      <input
        id={`tr-${order.id}`}
        name="tracking"
        defaultValue={order.merch_tracking ?? ""}
        placeholder="Guía de envío"
        className={field.replace("mt-2 ", "")}
      />
      <button type="submit" className="label min-h-11 border border-ink px-3 text-[10px] text-ink hover:bg-ink hover:text-paper">
        Guardar
      </button>
    </form>
  );
}

export default async function AdminMerch({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const { q, estado } = await searchParams;
  const status = STATUSES.includes(estado as MerchStatus) ? (estado as MerchStatus) : undefined;
  const [orders, summary] = await Promise.all([listMerchOrders({ q: q?.trim() || undefined, status }), merchSummary()]);

  const units = summary.variants.reduce((n, v) => n + v.quantity, 0);
  const revenue = summary.variants.reduce((n, v) => n + v.revenue, 0);
  const byStatus = Object.fromEntries(summary.statuses.map((s) => [s.merch_status, s.orders])) as Partial<Record<MerchStatus, number>>;
  const totalOrders = summary.statuses.reduce((n, s) => n + s.orders, 0);
  const notifyFailed = summary.statuses.reduce((n, s) => n + s.notify_failed, 0);

  const tab = (s?: MerchStatus) => {
    const params = new URLSearchParams();
    if (s) params.set("estado", s);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/admin/merch${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <h1 className="display ink-worn text-[clamp(2.4rem,6vw,4rem)] text-ink">Merch</h1>

      <dl className="mt-8 grid grid-cols-2 gap-px border border-rule bg-rule lg:grid-cols-4">
        <Stat label="Prendas vendidas" value={String(units)} note={`${totalOrders} pedidos pagados`} />
        <Stat label="Ingresos merch" value={formatPrice(revenue)} note="Neto, sin cargo por servicio" />
        <Stat label={merchOrders.status.pending} value={String(byStatus.pending ?? 0)} note="pedidos" />
        <Stat
          label="Enviados"
          value={String((byStatus.shipped ?? 0) + (byStatus.delivered ?? 0))}
          note={`${byStatus.delivered ?? 0} entregados`}
        />
      </dl>

      {notifyFailed ? (
        <p className="mt-4 border-l-2 border-[var(--accent)] pl-3 text-sm text-ink">
          {notifyFailed} {notifyFailed === 1 ? "aviso no llegó" : "avisos no llegaron"} al WhatsApp del equipo de merch (
          {merchOrders.notifyWhatsapp}). Usa “Reenviar aviso” en la tabla.
        </p>
      ) : null}

      <h2 className="label mt-12 text-[11px] text-ink">Producción · prendas por variante</h2>
      {summary.variants.length ? (
        <div className="mt-4 overflow-x-auto border border-rule bg-card/60">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="label border-b border-rule text-[10px] text-graphite">
                <th className="p-3 font-normal">Producto</th>
                <th className="p-3 font-normal">Diseño</th>
                <th className="p-3 font-normal">Color</th>
                <th className="p-3 font-normal">Corte</th>
                <th className="p-3 font-normal">Talla</th>
                <th className="p-3 text-right font-normal">Piezas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {summary.variants.map((v) => (
                <tr key={[v.item_id, v.model, v.color, v.fit, v.size].join(":")}>
                  <td className="p-3 text-ink">{product(v.item_id)?.name ?? v.item_id}</td>
                  {variantParts(v).map((part) => (
                    <td key={part.label} className="p-3">
                      {part.value ?? <span className="text-smoke">—</span>}
                    </td>
                  ))}
                  <td className="p-3 text-right tabular-nums text-ink">{v.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 border border-rule bg-card/60 p-6 text-sm text-graphite">Aún no hay merch vendida.</p>
      )}

      <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
        <h2 className="label text-[11px] text-ink">Pedidos</h2>
        <form className="flex w-full max-w-md gap-2" role="search">
          {status ? <input type="hidden" name="estado" value={status} /> : null}
          <label className="sr-only" htmlFor="q">
            Buscar
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Nombre, correo, teléfono u orden" className={field.replace("mt-2 ", "")} />
          <button type="submit" className={btn}>
            Buscar
          </button>
        </form>
      </div>
      <nav aria-label="Filtrar por estado" className="mt-4 flex flex-wrap gap-1">
        {[undefined, ...STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={tab(s)}
            aria-current={s === status ? "page" : undefined}
            className={`label inline-flex min-h-11 items-center border px-3 text-[10px] ${
              s === status ? "border-ink bg-ink text-paper" : "border-rule text-graphite hover:border-ink hover:text-ink"
            }`}
          >
            {s ? merchOrders.status[s] : "Todos"}
            {s ? <span className="ml-2 tabular-nums">{byStatus[s] ?? 0}</span> : null}
          </Link>
        ))}
      </nav>

      {orders.length ? (
        <div className="mt-4 overflow-x-auto border border-rule bg-card/60">
          <table className="w-full min-w-[1240px] text-left text-sm">
            <thead>
              <tr className="label border-b border-rule text-[10px] text-graphite">
                <th className="p-3 font-normal">Orden</th>
                <th className="p-3 font-normal">Cliente</th>
                <th className="p-3 font-normal">Envío</th>
                <th className="p-3 font-normal">Artículos</th>
                <th className="p-3 font-normal">Total</th>
                <th className="p-3 font-normal">Estado</th>
                <th className="p-3 font-normal">Aviso al equipo</th>
                <th className="p-3 font-normal">Confirmación al cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule align-top">
              {orders.map((o) => {
                const address = formatShipping(o.shipping);
                return (
                  <tr key={o.id} className={o.merch_status === "delivered" ? "text-graphite" : ""}>
                    <td className="whitespace-nowrap p-3">
                      <span className="font-mono text-[12px] text-ink">{orderRef(o.id)}</span>
                      <span className="block text-xs tabular-nums text-graphite">{fmtDate(o.paid_at)}</span>
                    </td>
                    <td className="p-3 text-xs">
                      <span className="text-sm text-ink">{o.customer_name ?? "—"}</span>
                      {o.customer_phone ? <span className="block">{o.customer_phone}</span> : null}
                      {o.customer_email ? <span className="block break-all">{o.customer_email}</span> : null}
                    </td>
                    <td className="whitespace-pre-line p-3 text-xs">{address ?? <span className="text-smoke">Sin dirección</span>}</td>
                    <td className="p-3">
                      <ul className="space-y-2">
                        {o.lines.map((l, i) => (
                          <li key={i}>
                            <span className="text-ink">
                              {l.quantity}× {product(l.item_id)?.name ?? l.item_id}
                            </span>
                            <span className="block text-xs text-graphite">
                              {variantParts(l)
                                .filter((part) => part.value)
                                .map((part) => `${part.label}: ${part.value}`)
                                .join(" · ")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="whitespace-nowrap p-3 tabular-nums">
                      {formatPrice(o.lines.reduce((n, l) => n + l.quantity * l.unit_price, 0))}
                    </td>
                    <td className="p-3">
                      <StatusForm order={o} />
                    </td>
                    <td className="p-3">
                      <Notice
                        order={o}
                        sentAt={o.merch_notified_at}
                        error={o.merch_notify_error}
                        action={resendMerchNotice}
                        label="Reenviar aviso"
                      />
                    </td>
                    <td className="p-3">
                      <Notice
                        order={o}
                        sentAt={o.merch_confirmed_at}
                        error={o.merch_confirm_error}
                        action={resendMerchConfirmation}
                        label="Reenviar confirmación"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 border border-rule bg-card/60 p-6 text-sm text-graphite">
          {q || status ? "Sin resultados." : "Aún no hay pedidos de merch."}
        </p>
      )}
      <p className="mt-2 text-xs text-graphite">
        Cada pedido pagado envía sus detalles por WhatsApp a {merchOrders.notifyWhatsapp} y una confirmación al cliente (correo
        y WhatsApp, con la foto de cada diseño). Las órdenes anuladas en Ventas dejan de aparecer aquí.
      </p>
    </>
  );
}
