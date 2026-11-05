import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/admin/forms";
import { event } from "@/content/trascendental";
import { getSession, homeFor } from "@/lib/server/admin-auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLogin() {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));
  return (
    <main className="mx-auto flex min-h-[100svh] max-w-sm flex-col justify-center px-5 py-16">
      <p className="label text-[11px] text-ink">
        {event.title} {event.edition} · Admin
      </p>
      <h1 className="display ink-worn mt-3 text-5xl text-ink">Acceso</h1>
      <LoginForm />
    </main>
  );
}
