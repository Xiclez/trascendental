"use client";

import { useActionState } from "react";
import {
  addStaff,
  admitTicket,
  courtesy,
  login,
  resetStaffPassword,
  saveSalesDisplayTiers,
  toggleSalesDisplay,
  type FormState,
} from "@/app/admin/actions";
import { btn, field } from "@/app/admin/styles";

function Message({ state }: { state: FormState }) {
  if (!state) return <p aria-live="polite" className="sr-only" />;
  return (
    <p aria-live="polite" className={`mt-4 border-l-2 pl-3 text-sm ${state.error ? "border-[var(--accent)] text-ink" : "border-ink text-ink"}`}>
      {state.error ?? state.ok}
    </p>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-10">
      <label className="label text-[10px] text-graphite" htmlFor="username">
        Usuario
      </label>
      <input
        id="username"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        className={field}
      />
      <label className="label mt-5 block text-[10px] text-graphite" htmlFor="password">
        Contraseña
      </label>
      <input id="password" name="password" type="password" autoComplete="current-password" required className={field} />
      <button type="submit" disabled={pending} className={`${btn} mt-6 w-full`}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <Message state={state} />
    </form>
  );
}

export function CourtesyForm({ tiers }: { tiers: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState(courtesy, null);
  return (
    <form action={action} className="grid gap-5 border border-rule bg-card/60 p-6 sm:grid-cols-2">
      <label className="label text-[10px] text-graphite sm:col-span-2">
        Nombre del invitado
        <input name="name" required maxLength={120} className={field} />
      </label>
      <label className="label text-[10px] text-graphite">
        Correo
        <input name="email" type="email" maxLength={160} className={field} placeholder="invitado@correo.com" />
      </label>
      <label className="label text-[10px] text-graphite">
        WhatsApp
        <input name="phone" type="tel" maxLength={20} className={field} placeholder="+52 614 000 0000" />
      </label>
      <label className="label text-[10px] text-graphite">
        Tipo de acceso
        <select name="tier" required className={field} defaultValue="">
          <option value="" disabled>
            Elegir…
          </option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="label text-[10px] text-graphite">
        Cantidad
        <input name="quantity" type="number" min={1} max={20} defaultValue={1} required className={field} />
      </label>
      <label className="label text-[10px] text-graphite sm:col-span-2">
        Nota interna (opcional)
        <input name="note" maxLength={300} className={field} placeholder="Ej. prensa, staff, patrocinador" />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className={btn}>
          {pending ? "Generando…" : "Generar y enviar QR"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function StaffForm() {
  const [state, action, pending] = useActionState(addStaff, null);
  return (
    <form action={action} className="grid gap-5 border border-rule bg-card/60 p-6 sm:grid-cols-2">
      <label className="label text-[10px] text-graphite">
        Nombre
        <input name="name" required maxLength={80} className={field} placeholder="Ej. Puerta norte · Ana" />
      </label>
      <label className="label text-[10px] text-graphite">
        Usuario
        <input
          name="username"
          required
          maxLength={32}
          pattern="[a-zA-Z0-9._\-]{3,32}"
          autoCapitalize="none"
          spellCheck={false}
          className={field}
          placeholder="puerta1"
        />
      </label>
      <label className="label text-[10px] text-graphite">
        Contraseña
        <input name="password" type="text" required minLength={8} autoComplete="new-password" className={field} />
      </label>
      <label className="label text-[10px] text-graphite">
        Rol
        <select name="role" required className={field} defaultValue="scanner">
          <option value="scanner">Escáner · solo registra accesos</option>
          <option value="admin">Admin · acceso total</option>
        </select>
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className={btn}>
          {pending ? "Creando…" : "Crear usuario"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function ResetPasswordForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(resetStaffPassword, null);
  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`pw-${id}`}>
        Nueva contraseña
      </label>
      <input
        id={`pw-${id}`}
        name="password"
        type="text"
        minLength={8}
        required
        autoComplete="new-password"
        placeholder="Nueva contraseña"
        className={`${field.replace("mt-2 ", "")} w-44`}
      />
      <button type="submit" disabled={pending} className="label inline-flex min-h-11 items-center border border-rule px-3 text-[10px] text-ink hover:border-ink">
        {pending ? "…" : "Cambiar"}
      </button>
      {state ? <p className="w-full text-xs text-graphite" aria-live="polite">{state.error ?? state.ok}</p> : null}
    </form>
  );
}

export function AdmitForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(admitTicket, null);
  return (
    <form action={action} className="mt-8">
      <input type="hidden" name="code" value={code} />
      <button type="submit" disabled={pending || Boolean(state?.ok)} className={`${btn} w-full min-h-14 text-[13px]`}>
        {pending ? "Registrando…" : state?.ok ? "Ingreso registrado" : "Registrar ingreso"}
      </button>
      <Message state={state} />
    </form>
  );
}

/** Switch for the marketing display. Submits on click; the server re-renders the new state. */
export function SalesDisplaySwitch({ enabled }: { enabled: boolean }) {
  return (
    <form action={toggleSalesDisplay}>
      <input type="hidden" name="enabled" value={enabled ? "off" : "on"} />
      <button type="submit" role="switch" aria-checked={enabled} className="inline-flex min-h-11 items-center gap-3 text-ink">
        <span aria-hidden className={`relative inline-block h-6 w-11 border border-ink transition-colors ${enabled ? "bg-ink" : "bg-card"}`}>
          <span className={`absolute top-0.5 size-[18px] transition-[left] ${enabled ? "left-[22px] bg-paper" : "left-0.5 bg-ink"}`} />
        </span>
        <span className="label text-[10px]">Porcentaje personalizado {enabled ? "activo" : "inactivo"}</span>
      </button>
    </form>
  );
}

export type SalesDisplayRow = {
  id: string;
  label: string;
  realPct: number | null;
  realState: string;
  publicState: string;
  publicPct: number | null;
  pct: number | null;
  soldout: boolean;
};

export function SalesDisplayForm({ rows, enabled }: { rows: SalesDisplayRow[]; enabled: boolean }) {
  const [state, action, pending] = useActionState(saveSalesDisplayTiers, null);
  return (
    <form action={action} className={`mt-4 border border-rule bg-card/60 ${enabled ? "" : "opacity-70"}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="label border-b border-rule text-[10px] text-graphite">
              <th className="p-3 font-normal">Fase</th>
              <th className="p-3 font-normal">Real</th>
              <th className="p-3 font-normal">% personalizado</th>
              <th className="p-3 font-normal">Agotar fase</th>
              <th className="p-3 font-normal">El público ve</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="p-3 text-ink">{r.label}</td>
                <td className="p-3 tabular-nums">
                  {r.realPct != null ? `${r.realPct}%` : "—"}
                  <span className="block text-xs text-graphite">{r.realState}</span>
                </td>
                <td className="p-3">
                  <label className="sr-only" htmlFor={`pct-${r.id}`}>
                    Porcentaje para {r.label}
                  </label>
                  <span className="flex items-center gap-2">
                    <input
                      id={`pct-${r.id}`}
                      name={`pct:${r.id}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={99}
                      step={1}
                      defaultValue={r.pct ?? ""}
                      placeholder="Real"
                      className={`${field.replace("mt-2 ", "")} w-24 tabular-nums`}
                    />
                    <span className="text-graphite">%</span>
                  </span>
                </td>
                <td className="p-3">
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
                    <input type="checkbox" name={`soldout:${r.id}`} defaultChecked={r.soldout} className="size-5 accent-[var(--color-ink)]" />
                    <span className="text-xs text-graphite">Agotada</span>
                  </label>
                </td>
                <td className="p-3 tabular-nums">
                  {r.publicPct != null ? `${r.publicPct}%` : "—"}
                  <span className="block text-xs text-graphite">{r.publicState}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-rule p-4">
        <button type="submit" disabled={pending} className={btn}>
          {pending ? "Guardando…" : "Guardar porcentajes"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}
