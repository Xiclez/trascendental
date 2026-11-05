import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStaff, type StaffRole } from "@/lib/server/staff";

/**
 * Staff sessions → signed, httpOnly cookie `role.uid.version.exp.mac`.
 *   uid "admin"  — master admin, logs in with ADMIN_PASSWORD (username "admin"). Sees everything.
 *   uid <uuid>   — staff_users row (src/lib/server/staff.ts). Re-checked against the DB on every
 *                  request, so deactivating a user or changing their password ends their session.
 * Every page AND server action calls requireAdmin() or requireStaff(); a layout check alone
 * does not protect server actions.
 */

const COOKIE = "tiv_admin";
const TTL_S = 12 * 60 * 60;
export const MASTER = "admin";

export type Session = { uid: string; role: StaffRole; name: string; username: string };

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("ADMIN_SESSION_SECRET debe tener al menos 32 caracteres");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function passwordMatches(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 12) return false; // refuse weak / missing config
  return safeEqual(input, expected);
}

export async function startSession(user: { uid: string; role: StaffRole; version: number }) {
  const exp = Math.floor(Date.now() / 1000) + TTL_S;
  const payload = `${user.role}.${user.uid}.${user.version}.${exp}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_S,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  const payload = raw.slice(0, i);
  const [role, uid, version, exp] = payload.split(".");
  try {
    if (!safeEqual(raw.slice(i + 1), sign(payload)) || Number(exp) * 1000 <= Date.now()) return null;
  } catch {
    return null;
  }
  if (uid === MASTER) return role === "admin" ? { uid, role: "admin", name: "Admin", username: MASTER } : null;
  const user = await getStaff(uid);
  if (!user || !user.active || user.session_version !== Number(version)) return null;
  return { uid, role: user.role, name: user.name, username: user.username };
}

export const isAdmin = async () => (await getSession())?.role === "admin";

/** Full panel (sales, orders, courtesies, users). Scanner accounts are sent to /scan. */
export async function requireAdmin() {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  if (s.role !== "admin") redirect("/scan");
  return s;
}

/** Door scanner: any active staff session. */
export async function requireStaff() {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  return s;
}

export const homeFor = (role: StaffRole) => (role === "admin" ? "/admin" : "/scan");

/* Brute-force brake for the login form: 5 attempts / 10 min per client (in memory). */
const attempts = new Map<string, { n: number; until: number }>();
export function loginAllowed(client: string) {
  const now = Date.now();
  const a = attempts.get(client);
  if (!a || a.until < now) {
    attempts.set(client, { n: 1, until: now + 10 * 60_000 });
    return true;
  }
  a.n += 1;
  return a.n <= 5;
}
export const loginSucceeded = (client: string) => attempts.delete(client);
