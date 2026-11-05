"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { tickets } from "@/content/trascendental";
import {
  endSession,
  homeFor,
  loginAllowed,
  loginSucceeded,
  MASTER,
  passwordMatches,
  requireAdmin,
  requireStaff,
  startSession,
} from "@/lib/server/admin-auth";
import { deliverOrder, tierLabel } from "@/lib/server/notify";
import { checkIn, createCourtesy, voidPaidOrder } from "@/lib/server/orders";
import {
  authenticateStaff,
  createStaff,
  deleteStaff,
  getStaff,
  MIN_PASSWORD,
  setStaffActive,
  setStaffPassword,
  USERNAME,
  type StaffRole,
} from "@/lib/server/staff";

export type FormState = { error?: string; ok?: string } | null;

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const h = await headers();
  const client = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (!loginAllowed(client)) return { error: "Demasiados intentos. Espera 10 minutos." };
  const username = str(fd, "username").toLowerCase();
  const password = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";

  let home: string;
  if (username === MASTER) {
    if (!passwordMatches(password)) return { error: "Usuario o contraseña incorrectos." };
    await startSession({ uid: MASTER, role: "admin", version: 0 });
    home = homeFor("admin");
  } else {
    const user = USERNAME.test(username) ? await authenticateStaff(username, password) : null;
    if (!user) return { error: "Usuario o contraseña incorrectos." };
    await startSession({ uid: user.id, role: user.role, version: user.session_version });
    home = homeFor(user.role);
  }
  loginSucceeded(client);
  redirect(home);
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function courtesy(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase() || null;
  const phone = str(fd, "phone").replace(/[^\d+]/g, "") || null;
  const tierId = str(fd, "tier");
  const quantity = Math.floor(Number(str(fd, "quantity")));
  const note = str(fd, "note").slice(0, 300) || null;

  if (name.length < 2) return { error: "Escribe el nombre del invitado." };
  if (!email && !phone) return { error: "Agrega correo o WhatsApp para enviar el QR." };
  if (email && !EMAIL.test(email)) return { error: "Correo inválido." };
  if (phone && phone.replace(/\D/g, "").length < 10) return { error: "WhatsApp inválido (10 dígitos o con lada +52)." };
  if (!tickets.some((t) => t.id === tierId)) return { error: "Elige el tipo de acceso." };
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 20) return { error: "Cantidad entre 1 y 20." };

  try {
    const orderId = await createCourtesy({ name, email, phone, tierId, quantity, note });
    after(() => deliverOrder(orderId));
  } catch (err) {
    console.error("[admin:courtesy]", err);
    return { error: "No se pudo generar la cortesía." };
  }
  revalidatePath("/admin", "layout");
  return { ok: `${quantity} ${quantity === 1 ? "cortesía generada" : "cortesías generadas"} para ${name}. Enviando QR…` };
}

export async function resend(fd: FormData) {
  await requireAdmin();
  const orderId = str(fd, "order");
  const channel = str(fd, "channel");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return;
  await deliverOrder(orderId, { force: true, email: channel !== "whatsapp", whatsapp: channel !== "email" });
  revalidatePath("/admin", "layout");
}

/** Voids a paid order: its tickets stop working at the door and its stock is released. */
export async function voidOrder(fd: FormData) {
  await requireAdmin();
  const orderId = str(fd, "order");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return;
  await voidPaidOrder(orderId);
  revalidatePath("/admin", "layout");
}

/** "Registrar ingreso" on /t/[code] (any staff). */
export async function admitTicket(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireStaff();
  const code = str(fd, "code");
  const r = await checkIn(code, s.username);
  revalidatePath(`/t/${code}`);
  return r.ok ? { ok: "Ingreso registrado" } : { error: r.reason };
}

/* ---------------------------------------------------------------- scanner */

export type ScanResult =
  | { status: "ok" | "used" | "invalid"; code: string; label: string; holder: string | null; courtesy: boolean; detail: string }
  | { status: "notfound"; code: string; detail: string };

const CODE = /IV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/;

/** Door scanner (/scan). Accepts the QR's URL (…/t/IV-XXXX-…) or a typed code. */
export async function scanTicket(raw: string): Promise<ScanResult> {
  const s = await requireStaff();
  const code = String(raw ?? "").toUpperCase().match(CODE)?.[0];
  if (!code) return { status: "notfound", code: String(raw ?? "").slice(0, 60), detail: "No es un QR de Trascendental IV" };
  const r = await checkIn(code, s.username);
  if (!r.ok && r.kind === "notfound") return { status: "notfound", code, detail: r.reason };
  const t = r.ticket;
  return {
    status: r.ok ? "ok" : r.kind,
    code,
    label: tierLabel(t.tier_id),
    holder: t.holder_name,
    courtesy: t.courtesy,
    detail: r.ok ? "Ingreso registrado" : r.reason,
  };
}

/* ------------------------------------------------------------------ users */

const ROLES: StaffRole[] = ["scanner", "admin"];

export async function addStaff(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(fd, "name");
  const username = str(fd, "username").toLowerCase();
  const password = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";
  const role = str(fd, "role") as StaffRole;
  if (name.length < 2) return { error: "Escribe el nombre." };
  if (!USERNAME.test(username) || username === MASTER) return { error: "Usuario: 3–32 caracteres (a-z, 0-9, punto, guion). “admin” está reservado." };
  if (password.length < MIN_PASSWORD) return { error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` };
  if (!ROLES.includes(role)) return { error: "Elige el rol." };
  try {
    await createStaff({ name, username, password, role });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return { error: `El usuario “${username}” ya existe.` };
    console.error("[admin:staff]", err);
    return { error: "No se pudo crear el usuario." };
  }
  revalidatePath("/admin/usuarios");
  return { ok: `Usuario ${username} creado.` };
}

export async function resetStaffPassword(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const user = await getStaff(str(fd, "id"));
  const password = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";
  if (!user) return { error: "Usuario no encontrado." };
  if (password.length < MIN_PASSWORD) return { error: `Mínimo ${MIN_PASSWORD} caracteres.` };
  await setStaffPassword(user.id, password);
  revalidatePath("/admin/usuarios");
  return { ok: "Contraseña cambiada. Se cerró su sesión." };
}

export async function toggleStaff(fd: FormData) {
  await requireAdmin();
  const user = await getStaff(str(fd, "id"));
  if (user) await setStaffActive(user.id, !user.active);
  revalidatePath("/admin/usuarios");
}

export async function removeStaff(fd: FormData) {
  await requireAdmin();
  const user = await getStaff(str(fd, "id"));
  if (user) await deleteStaff(user.id);
  revalidatePath("/admin/usuarios");
}
