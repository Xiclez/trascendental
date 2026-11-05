"use client";

import { useActionState } from "react";
import { addStaff, admitTicket, courtesy, login, resetStaffPassword, type FormState } from "@/app/admin/actions";
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
