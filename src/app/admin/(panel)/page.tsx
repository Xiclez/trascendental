import { btn, field } from "@/app/admin/styles";
import { OrdersTable } from "@/app/admin/orders-table";
import { formatPrice, tickets } from "@/content/trascendental";
import { listOrders, orderCounts } from "@/lib/server/admin-data";
import { availabilityOf, remainingOf, tierStats } from "@/lib/server/inventory";

const availabilityText = {
  available: "Abierta",
  low: "Pocos lugares",
  soldout: "Agotada",
  upcoming: "En espera",
  closed: "Cerrada (fecha)",
} as const;

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-paper p-5">
      <dt className="label text-[10px] text-graphite">{label}</dt>
      <dd className="display mt-3 text-[clamp(1.8rem,4vw,2.8rem)] tabular-nums text-ink">{value}</dd>
      {note ? <dd className="mt-1 text-xs text-graphite">{note}</dd> : null}
    </div>
  );
}

export default async function AdminSales({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [stats, counts, orders] = await Promise.all([tierStats(), orderCounts(), listOrders({ q: q?.trim() || undefined })]);
  const rows = tickets.map((t) => ({ tier: t, s: stats.get(t.id)! }));
  const total = rows.reduce(
    (a, { s }) => ({
      sold: a.sold + s.sold,
      revenue: a.revenue + s.revenue,
      courtesy: a.courtesy + s.courtesy,
      checkedIn: a.checkedIn + s.checkedIn,
    }),
    { sold: 0, revenue: 0, courtesy: 0, checkedIn: 0 },
  );

  return (
    <>
      <h1 className="display ink-worn text-[clamp(2.4rem,6vw,4rem)] text-ink">Ventas</h1>

      <dl className="mt-8 grid grid-cols-2 gap-px border border-rule bg-rule lg:grid-cols-4">
        <Stat label="Boletos vendidos" value={String(total.sold)} note={`${counts.paid} órdenes pagadas`} />
        <Stat label="Ingresos boletos" value={formatPrice(total.revenue)} note={`Neto · los compradores pagaron ${formatPrice(counts.fees / 100)} de cargo por servicio (comisión Stripe)`} />
        <Stat label="Cortesías" value={String(total.courtesy)} />
        <Stat label="Ingresaron" value={String(total.checkedIn)} note={`de ${total.sold + total.courtesy} emitidos`} />
      </dl>

      {counts.email_failed || counts.wa_failed ? (
        <p className="mt-4 border-l-2 border-[var(--accent)] pl-3 text-sm text-ink">
          Entregas fallidas: {counts.email_failed} por correo, {counts.wa_failed} por WhatsApp. Usa “Reenviar” en la tabla.
        </p>
      ) : null}

      <h2 className="label mt-12 text-[11px] text-ink">Boletos por fase</h2>
      <div className="mt-4 overflow-x-auto border border-rule bg-card/60">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="label border-b border-rule text-[10px] text-graphite">
              <th className="p-3 font-normal">Fase</th>
              <th className="p-3 font-normal">Precio</th>
              <th className="p-3 font-normal">Vendidos / cupo</th>
              <th className="p-3 font-normal">En checkout</th>
              <th className="p-3 font-normal">Disponibles</th>
              <th className="p-3 font-normal">Cortesías</th>
              <th className="p-3 font-normal">Ingresos</th>
              <th className="p-3 font-normal">Ingresaron</th>
              <th className="p-3 font-normal">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map(({ tier, s }) => {
              const remaining = remainingOf(tier, s);
              const pct = tier.capacity ? Math.min(100, (s.sold / tier.capacity) * 100) : null;
              return (
                <tr key={tier.id}>
                  <td className="p-3">
                    <span className="text-ink">{tier.name}</span>
                    <span className="block text-xs text-graphite">{tier.phase}</span>
                  </td>
                  <td className="p-3 tabular-nums">{formatPrice(tier.price)}</td>
                  <td className="p-3 tabular-nums">
                    {s.sold}
                    {tier.capacity ? ` / ${tier.capacity}` : ""}
                    {pct != null ? (
                      <span aria-hidden className="mt-1.5 block h-1 w-28 bg-rule">
                        <span className="block h-full bg-ink" style={{ width: `${pct}%` }} />
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3 tabular-nums">{s.reserved}</td>
                  <td className="p-3 tabular-nums">{remaining ?? (tier.salesEndAt ? "Sin límite" : "Sin cupo")}</td>
                  <td className="p-3 tabular-nums">{s.courtesy}</td>
                  <td className="p-3 tabular-nums">{formatPrice(s.revenue)}</td>
                  <td className="p-3 tabular-nums">{s.checkedIn}</td>
                  <td className="p-3">{availabilityText[availabilityOf(tier, stats)]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-graphite">
        “En checkout” son boletos apartados por compradores que están pagando en Stripe; se liberan a los 35 min si no
        pagan. Las cortesías no consumen cupo.
      </p>

      <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
        <h2 className="label text-[11px] text-ink">Órdenes</h2>
        <form className="flex w-full max-w-md gap-2" role="search">
          <label className="sr-only" htmlFor="q">
            Buscar
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Nombre, correo, teléfono o código" className={field.replace("mt-2 ", "")} />
          <button type="submit" className={btn}>
            Buscar
          </button>
        </form>
      </div>
      <div className="mt-4">
        <OrdersTable orders={orders} empty={q ? "Sin resultados." : "Aún no hay órdenes."} />
      </div>
    </>
  );
}
