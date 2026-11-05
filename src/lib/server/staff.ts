import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "@/lib/server/db";

/** Staff accounts for the door scanner (and optional extra admins). Server-only. */

export type StaffRole = "admin" | "scanner";
export type StaffUser = {
  id: string;
  username: string;
  name: string;
  role: StaffRole;
  active: boolean;
  session_version: number;
  last_login_at: Date | null;
  created_at: Date;
};

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, 32);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function verifyPassword(pw: string, stored: string) {
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(pw, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

export const USERNAME = /^[a-z0-9._-]{3,32}$/;
export const MIN_PASSWORD = 8;

const COLUMNS = ["id", "username", "name", "role", "active", "session_version", "last_login_at", "created_at"];

export async function listStaff() {
  return db()<StaffUser[]>`select ${db()(COLUMNS)} from staff_users order by role, name`;
}

export async function getStaff(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [u] = await db()<StaffUser[]>`select ${db()(COLUMNS)} from staff_users where id = ${id}`;
  return u ?? null;
}

/** Returns the user when username + password match an active account. */
export async function authenticateStaff(username: string, password: string) {
  const [u] = await db()<(StaffUser & { password_hash: string })[]>`
    select ${db()(COLUMNS)}, password_hash from staff_users where username = ${username.toLowerCase()}`;
  // Hash anyway when the user doesn't exist, so timing doesn't reveal valid usernames.
  const ok = await verifyPassword(password, u?.password_hash ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
  if (!u || !ok || !u.active) return null;
  await db()`update staff_users set last_login_at = now() where id = ${u.id}`;
  return u;
}

export async function createStaff(input: { username: string; name: string; password: string; role: StaffRole }) {
  await db()`
    insert into staff_users (username, name, password_hash, role)
    values (${input.username.toLowerCase()}, ${input.name}, ${await hashPassword(input.password)}, ${input.role})`;
}

/** New password also signs the user out everywhere. */
export async function setStaffPassword(id: string, password: string) {
  await db()`
    update staff_users set password_hash = ${await hashPassword(password)}, session_version = session_version + 1
    where id = ${id}`;
}

export async function setStaffActive(id: string, active: boolean) {
  await db()`update staff_users set active = ${active}, session_version = session_version + 1 where id = ${id}`;
}

export async function deleteStaff(id: string) {
  await db()`delete from staff_users where id = ${id}`;
}
