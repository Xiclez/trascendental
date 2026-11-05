import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { event } from "@/content/trascendental";
import { requireStaff } from "@/lib/server/admin-auth";
import { dbConfigured } from "@/lib/server/db";

/** Door-scanner platform: any staff session (admin or scanner). Scanner accounts never see /admin. */

export const metadata: Metadata = { title: "Escáner", robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#151515" };

export default async function ScanLayout({ children }: { children: React.ReactNode }) {
  const s = await requireStaff();
  return (
    <div className="flex min-h-[100svh] flex-col bg-paper">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2">
          <p className="label flex-1 truncate text-[10px] text-ink">
            {event.title} {event.edition} · Acceso · <span className="text-graphite">{s.name}</span>
          </p>
          {s.role === "admin" ? (
            <Link href="/admin" className="label inline-flex min-h-11 items-center px-2 text-[10px] text-ink">
              Panel
            </Link>
          ) : null}
          <form action={logout}>
            <button type="submit" className="label inline-flex min-h-11 items-center px-2 text-[10px] text-graphite hover:text-ink">
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-4">
        {dbConfigured() ? children : <p className="text-graphite">Falta DATABASE_URL: no hay base de datos conectada.</p>}
      </main>
    </div>
  );
}
