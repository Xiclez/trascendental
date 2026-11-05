import postgres, { type Sql } from "postgres";

/**
 * Postgres connection (VPS). One pool per process; kept on globalThis so
 * `next dev` hot reloads don't open a new pool each time.
 * Server-only: never import from a client component.
 */

const globalForDb = globalThis as unknown as { __tivSql?: Sql };

export const dbConfigured = () => Boolean(process.env.DATABASE_URL);

export function db(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está configurada");
  globalForDb.__tivSql ??= postgres(url, {
    max: 10,
    idle_timeout: 30,
    // false behind PgBouncer (transaction mode) or other poolers that share backends.
    prepare: process.env.DATABASE_PREPARE !== "false",
    onnotice: () => {},
  });
  return globalForDb.__tivSql;
}

/** Idempotent schema. Runs once per server start from src/instrumentation.ts. */
const SCHEMA = /* sql */ `
create table if not exists orders (
  id                    uuid primary key default gen_random_uuid(),
  source                text not null check (source in ('stripe', 'courtesy')),
  status                text not null default 'pending'
                          check (status in ('pending', 'paid', 'expired', 'canceled', 'refunded')),
  stripe_session_id     text unique,
  stripe_payment_intent text,
  customer_name         text,
  customer_email        text,
  customer_phone        text,
  amount_total          integer not null default 0, -- centavos
  currency              text not null default 'mxn',
  note                  text,
  expires_at            timestamptz,
  paid_at               timestamptz,
  email_sent_at         timestamptz,
  email_error           text,
  whatsapp_sent_at      timestamptz,
  whatsapp_error        text,
  created_at            timestamptz not null default now()
);
-- Service charge (Stripe fee passed to the buyer), centavos, included in amount_total.
alter table orders add column if not exists service_fee integer not null default 0;
create index if not exists orders_status_idx on orders (status, expires_at);
create index if not exists orders_created_idx on orders (created_at desc);

create table if not exists order_lines (
  id         bigserial primary key,
  order_id   uuid not null references orders (id) on delete cascade,
  kind       text not null check (kind in ('ticket', 'product')),
  item_id    text not null,
  quantity   integer not null check (quantity > 0),
  unit_price integer not null, -- pesos, copied from content at purchase time
  color      text,
  size       text
);
-- Design id for products with models (merch), e.g. 'portales'.
alter table order_lines add column if not exists model text;
create index if not exists order_lines_order_idx on order_lines (order_id);
create index if not exists order_lines_item_idx on order_lines (kind, item_id);

create table if not exists tickets (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  order_id      uuid not null references orders (id) on delete cascade,
  tier_id       text not null,
  holder_name   text,
  courtesy      boolean not null default false,
  status        text not null default 'valid' check (status in ('valid', 'void')),
  checked_in_at timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists tickets_order_idx on tickets (order_id);
create index if not exists tickets_tier_idx on tickets (tier_id);

-- Staff accounts (src/lib/server/staff.ts). The master admin is ADMIN_PASSWORD and has no row.
-- 'scanner' can only use /scan; 'admin' sees the whole panel. Bumping session_version logs the user out.
create table if not exists staff_users (
  id              uuid primary key default gen_random_uuid(),
  username        text not null unique check (username = lower(username) and username <> 'admin'),
  name            text not null,
  password_hash   text not null,
  role            text not null check (role in ('admin', 'scanner')),
  active          boolean not null default true,
  session_version integer not null default 0,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now()
);

-- Who let each ticket in ('admin' = master password, otherwise staff username).
alter table tickets add column if not exists checked_in_by text;
`;

export async function migrate() {
  if (!dbConfigured()) {
    console.warn("[db] DATABASE_URL ausente — ventas, admin y QR deshabilitados.");
    return;
  }
  await db().unsafe(SCHEMA);
  console.log("[db] esquema listo");
}
