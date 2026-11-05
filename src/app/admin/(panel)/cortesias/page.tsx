import { CourtesyForm } from "@/app/admin/forms";
import { OrdersTable } from "@/app/admin/orders-table";
import { tickets } from "@/content/trascendental";
import { listOrders } from "@/lib/server/admin-data";

export default async function AdminCourtesies() {
  const orders = await listOrders({ source: "courtesy", limit: 200 });
  const tiers = tickets.map((t) => ({ id: t.id, label: `${t.name} · ${t.phase}` }));
  return (
    <>
      <h1 className="display ink-worn text-[clamp(2.4rem,6vw,4rem)] text-ink">Cortesías</h1>
      <p className="mt-3 max-w-xl text-sm text-graphite">
        Genera accesos sin costo. Cada persona recibe su propio QR por correo y/o WhatsApp. No consumen el cupo de la fase.
      </p>
      <div className="mt-8 max-w-3xl">
        <CourtesyForm tiers={tiers} />
      </div>
      <h2 className="label mt-12 text-[11px] text-ink">Cortesías emitidas</h2>
      <div className="mt-4">
        <OrdersTable orders={orders} empty="Aún no hay cortesías." />
      </div>
    </>
  );
}
