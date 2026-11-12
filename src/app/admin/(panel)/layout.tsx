import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { event } from "@/content/trascendental";
import { requireAdmin } from "@/lib/server/admin-auth";
import { dbConfigured } from "@/lib/server/db";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const links = [
  { href: "/admin", label: "Ventas" },
  { href: "/admin/merch", label: "Merch" },
  { href: "/admin/cortesias", label: "Cortesías" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/scan", label: "Escáner" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const stripeTestMode = /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "");
  return (
    <div className="min-h-[100svh]">
      <header className="border-b border-rule bg-paper/90">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3 sm:px-8">
          <p className="label text-[11px] text-ink">
            {event.title} {event.edition} · Admin
          </p>
          <nav aria-label="Admin" className="flex flex-1 gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="label inline-flex min-h-11 items-center px-3 text-[11px] text-ink hover:bg-card">
                {l.label}
              </Link>
            ))}
          </nav>
          <form action={logout}>
            <button type="submit" className="label inline-flex min-h-11 items-center px-3 text-[11px] text-graphite hover:text-ink">
              Salir
            </button>
          </form>
        </div>
      </header>
      {stripeTestMode ? (
        <p role="status" className="border-b border-ink bg-ink px-5 py-3 text-center text-sm text-paper sm:px-8">
          <span aria-hidden className="mr-2 inline-block size-2 rounded-full bg-[var(--color-red)] align-middle" />
          Stripe está en <strong>modo de prueba</strong>: los pagos NO se cobran. Cambia STRIPE_SECRET_KEY por la clave live en el servidor.
        </p>
      ) : null}
      <main className="mx-auto max-w-[1320px] px-5 py-10 sm:px-8">
        {dbConfigured() ? children : <p className="text-graphite">Falta DATABASE_URL: no hay base de datos conectada.</p>}
      </main>
    </div>
  );
}
