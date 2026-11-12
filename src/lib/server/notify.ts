import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import {
  contact,
  delivery,
  event,
  flyer,
  formatPrice,
  merchOrders,
  merchVariant,
  products,
  site,
  tickets as tiers,
} from "@/content/trascendental";
import { db } from "@/lib/server/db";
import { ticketImage } from "@/lib/server/ticket-art";

/**
 * Ticket delivery: one QR per ticket, sent by email (EmailJS) and WhatsApp (Evolution API).
 * Each channel records its own sent_at / error on the order so the admin can retry.
 */

export const ticketUrl = (code: string) => new URL(`/t/${code}`, site.url).toString();

export const tierLabel = (tierId: string) => {
  const t = tiers.find((x) => x.id === tierId);
  return t ? `${t.name} · ${t.phase}` : tierId;
};

export function qrPng(code: string) {
  return QRCode.toBuffer(ticketUrl(code), {
    type: "png",
    width: 640,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#151515", light: "#ffffff" },
  });
}

/* ------------------------------------------------------------------ email */

/** Ticket artwork + QR as JPEG (src/app/api/boleto/[code]). Email clients block data: URIs, so the mail links it. */
export const ticketImageUrl = (code: string) => new URL(`/api/boleto/${code}.jpg`, site.url).toString();

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type Ticket = { code: string; tier_id: string; courtesy: boolean };
type Order = { id: string; customer_name: string | null; customer_email: string | null; customer_phone: string | null; source: string };

/* EmailJS allows 1 request/second per account: space sends out within this process. */
let emailQueue: Promise<unknown> = Promise.resolve();
const throttled = <T,>(fn: () => Promise<T>) => {
  const run = emailQueue.then(fn);
  emailQueue = run.catch(() => {}).then(() => new Promise((r) => setTimeout(r, 1100)));
  return run;
};

/**
 * EmailJS REST — POST https://api.emailjs.com/api/v1.0/email/send
 * The template (deploy/emailjs-template.html) renders {{{tickets_html}}} with triple braces.
 * Requires "Allow EmailJS API for non-browser applications" in EmailJS → Account → Security.
 */
async function sendEmail(order: Order, list: Ticket[]) {
  const intro = order.source === "courtesy" ? delivery.emailCourtesyIntro : delivery.emailIntro;
  // Each ticket is the official artwork with its QR (/api/boleto/…, 1024×1536 shown at 496 px),
  // then the code and a link. Compact on purpose: EmailJS caps params at 50 KB and a courtesy
  // batch can be 20 tickets.
  const lbl = "font:600 9px/1 'Archivo',Arial,sans-serif;letter-spacing:.26em;text-transform:uppercase";
  const pad = (n: number) => String(n).padStart(2, "0");
  const ticketsHtml = list
    .map(
      (tk, i) => `<tr><td style="padding:0 0 28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="padding:0 0 10px;${lbl};color:#151515">${tk.courtesy ? "Cortesía" : "Boleto"} · ${esc(tierLabel(tk.tier_id))}</td>
<td align="right" style="padding:0 0 10px;font:500 15px/1 'Bodoni Moda',Didot,Georgia,serif;color:#151515">${pad(i + 1)} / ${pad(list.length)}</td></tr></table>
<a href="${ticketImageUrl(tk.code)}"><img src="${ticketImageUrl(tk.code)}" width="496" alt="Boleto ${esc(tierLabel(tk.tier_id))} con código QR ${tk.code}" style="display:block;width:100%;max-width:496px;height:auto;border:2px solid #151515"></a>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="padding-top:12px;font:600 14px/1 'Courier New',monospace;letter-spacing:.18em;color:#151515">${tk.code}</td>
<td align="right" style="padding-top:12px;${lbl}"><a href="${ticketUrl(tk.code)}" style="color:#151515">Abrir boleto</a></td></tr></table>
</td></tr>`,
    )
    .join("");
  const ticketsText = list
    .map((tk, i) => `Boleto ${i + 1}/${list.length} · ${tierLabel(tk.tier_id)} · ${tk.code} · ${ticketUrl(tk.code)}`)
    .join("\n");

  await emailjs(order, {
    subject: delivery.emailSubject,
    preheader: delivery.emailPreheader(list.length),
    intro,
    tickets_html: ticketsHtml,
    tickets_text: ticketsText,
    how_to: delivery.howTo,
  });
}

/** One send of the shared template; `params` fills the body ({{{tickets_html}}} holds the items). */
async function emailjs(
  order: Order,
  params: { subject: string; preheader: string; intro: string; tickets_html: string; tickets_text: string; how_to: string },
) {
  const service = process.env.EMAILJS_SERVICE_ID;
  const template = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  if (!service || !template || !publicKey || !privateKey)
    throw new Error("EmailJS no configurado (EMAILJS_SERVICE_ID / _TEMPLATE_ID / _PUBLIC_KEY / _PRIVATE_KEY)");
  if (!order.customer_email) throw new Error("La orden no tiene correo");

  await throttled(async () => {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: service,
        template_id: template,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: {
          to_email: order.customer_email,
          to_name: order.customer_name ?? "",
          presenter: event.presenter,
          event_title: event.title,
          event_edition: event.edition,
          event_date: event.dateLong,
          event_date_label: event.dateLabel,
          event_doors: event.doorsLabel,
          event_city: event.venue.city,
          event_venue: `${event.venue.name}, ${event.venue.city}`,
          event_address: event.venue.address,
          greeting: order.customer_name ? `Hola ${order.customer_name.split(" ")[0]},` : "Hola,",
          ...params,
          microprint: flyer.microprint,
          site_url: site.url,
          contact_email: contact.email,
          instagram: contact.instagram,
          instagram_url: contact.instagramUrl,
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`EmailJS ${res.status}: ${(await res.text()).slice(0, 300)}`);
  });
}

/* --------------------------------------------------------------- whatsapp */

/** Stripe gives E.164 (+52…); Evolution expects digits only. Bare 10-digit numbers are assumed MX. */
export function waNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `52${digits}` : digits;
}

/**
 * Evolution API v2 — POST {EVOLUTION_API_URL}/message/{sendText|sendMedia}/{EVOLUTION_INSTANCE}
 * with header `apikey`. If your endpoint differs, this is the only function to adapt.
 */
async function evolution(path: "sendText" | "sendMedia", body: Record<string, unknown>) {
  const base = process.env.EVOLUTION_API_URL;
  const instance = process.env.EVOLUTION_INSTANCE;
  const key = process.env.EVOLUTION_API_KEY;
  if (!base || !instance || !key) throw new Error("Evolution API no configurada (EVOLUTION_API_URL / _INSTANCE / _API_KEY)");
  const res = await fetch(`${base.replace(/\/$/, "")}/message/${path}/${encodeURIComponent(instance)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Evolution ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function sendWhatsapp(order: Order, list: Ticket[]) {
  if (!order.customer_phone) throw new Error("La orden no tiene teléfono");
  const number = waNumber(order.customer_phone);
  await evolution("sendText", { number, text: delivery.whatsappGreeting(order.customer_name) });
  for (const [i, tk] of list.entries()) {
    await evolution("sendMedia", {
      number,
      mediatype: "image",
      mimetype: "image/jpeg",
      fileName: `${tk.code}.jpg`,
      caption: delivery.whatsappCaption(tierLabel(tk.tier_id), tk.code, i + 1, list.length),
      media: (await ticketImage(tk.code, tk.tier_id, ticketUrl(tk.code))).toString("base64"),
    });
  }
}

/* ------------------------------------------------------------- orchestrate */

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 500);

/**
 * Sends the order's valid tickets on each channel not yet delivered
 * (or on every channel with `force`). Never throws: failures are stored on the order.
 */
export async function deliverOrder(orderId: string, opts: { force?: boolean; email?: boolean; whatsapp?: boolean } = {}) {
  const sql = db();
  const [order] = await sql<(Order & { email_sent_at: Date | null; whatsapp_sent_at: Date | null })[]>`
    select id, source, customer_name, customer_email, customer_phone, email_sent_at, whatsapp_sent_at
    from orders where id = ${orderId} and status = 'paid'`;
  if (!order) return;
  const list = await sql<Ticket[]>`
    select code, tier_id, courtesy from tickets
    where order_id = ${orderId} and status = 'valid' order by created_at, code`;
  if (!list.length) return;

  const wantEmail = opts.email ?? true;
  const wantWa = opts.whatsapp ?? true;

  if (wantEmail && order.customer_email && (opts.force || !order.email_sent_at)) {
    try {
      await sendEmail(order, list);
      await sql`update orders set email_sent_at = now(), email_error = null where id = ${orderId}`;
    } catch (e) {
      console.error("[deliver:email]", orderId, e);
      await sql`update orders set email_error = ${errText(e)} where id = ${orderId}`;
    }
  }
  if (wantWa && order.customer_phone && (opts.force || !order.whatsapp_sent_at)) {
    try {
      await sendWhatsapp(order, list);
      await sql`update orders set whatsapp_sent_at = now(), whatsapp_error = null where id = ${orderId}`;
    } catch (e) {
      console.error("[deliver:whatsapp]", orderId, e);
      await sql`update orders set whatsapp_error = ${errText(e)} where id = ${orderId}`;
    }
  }
}

/* ------------------------------------------------------------------ merch */

type Shipping = {
  name: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    postal_code: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
};

/** Multi-line postal address (WhatsApp + admin). */
export function formatShipping(s: Shipping | null) {
  const a = s?.address;
  if (!a) return null;
  return [
    s.name,
    [a.line1, a.line2].filter(Boolean).join(", "),
    [a.postal_code, a.city].filter(Boolean).join(" "),
    [a.state, a.country && a.country !== "MX" ? a.country : null].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join("\n");
}

export const orderRef = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

type MerchRow = {
  item_id: string;
  quantity: number;
  unit_price: number;
  model: string | null;
  color: string | null;
  fit: string | null;
  size: string | null;
};

/** A paid order with merch and its product lines, or null. */
async function loadMerch(orderId: string) {
  const sql = db();
  const [order] = await sql<
    (Order & {
      paid_at: Date | null;
      shipping: Shipping | null;
      merch_notified_at: Date | null;
      merch_confirmed_at: Date | null;
    })[]
  >`
    select id, source, customer_name, customer_email, customer_phone, paid_at, shipping, merch_notified_at, merch_confirmed_at
    from orders where id = ${orderId} and status = 'paid' and merch_status is not null`;
  if (!order) return null;
  const lines = await sql<MerchRow[]>`
    select item_id, quantity, unit_price, model, color, fit, size from order_lines
    where order_id = ${orderId} and kind = 'product' order by id`;
  return lines.length ? { order, lines } : null;
}

const merchTotal = (lines: MerchRow[]) => lines.reduce((n, l) => n + l.quantity * l.unit_price, 0);

/** "• 2× Playera Trascendental IV" + the variant on the next line (WhatsApp). */
const itemLines = (lines: MerchRow[]) =>
  lines.map((l) => {
    const p = products.find((x) => x.id === l.item_id);
    const variant = merchVariant(p, l);
    return `• ${l.quantity}× ${p?.name ?? l.item_id}${variant ? `\n   ${variant}` : ""}`;
  });

/** Front + back photo of the design/colour bought (public/media/merch/…-pair.jpg), if it has one. */
const productPhoto = (l: MerchRow) => {
  const p = products.find((x) => x.id === l.item_id);
  const m = p?.models?.find((x) => x.id === l.model);
  return (l.color && m?.photos[l.color]?.pair) || p?.image || null;
};

const absolute = (src: string) => new URL(src, site.url).toString();

/** Reads a public/ file for WhatsApp (base64), so Evolution never has to reach the site. */
const publicFile = (src: string) => readFile(path.join(process.cwd(), "public", src.replace(/^\//, "")));

async function sendMerchEmail(order: Order, lines: MerchRow[], ref: string, address: string | null) {
  const lbl = "font:600 9px/1 'Archivo',Arial,sans-serif;letter-spacing:.26em;text-transform:uppercase";
  const rows = lines
    .map((l) => {
      const p = products.find((x) => x.id === l.item_id);
      const photo = productPhoto(l);
      const variant = merchVariant(p, l);
      return `<tr><td style="padding:0 0 28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="padding:0 0 10px;${lbl};color:#151515">${esc(p?.name ?? l.item_id)}</td>
<td align="right" style="padding:0 0 10px;font:500 15px/1 'Bodoni Moda',Didot,Georgia,serif;color:#151515">${l.quantity}×</td></tr></table>
${photo ? `<img src="${absolute(photo)}" width="496" alt="${esc(`${p?.name ?? ""} ${variant}`)}" style="display:block;width:100%;max-width:496px;height:auto;border:1px solid #cfcdc7">` : ""}
<p style="margin:12px 0 0;font:13px/1.5 Inter,Arial,sans-serif;color:#151515">${esc(variant)}</p>
<p style="margin:4px 0 0;font:13px/1.5 Inter,Arial,sans-serif;color:#5a5a5a">${formatPrice(l.unit_price * l.quantity)}</p>
</td></tr>`;
    })
    .join("");
  const shipTo = address
    ? `<tr><td style="padding:0 0 24px"><p style="margin:0;${lbl};color:#8a8883">Envío a</p>
<p style="margin:8px 0 0;font:13px/1.5 Inter,Arial,sans-serif;color:#151515">${esc(address).replace(/\n/g, "<br>")}</p></td></tr>`
    : "";
  await emailjs(order, {
    subject: merchOrders.confirmSubject,
    preheader: merchOrders.confirmPreheader(ref),
    intro: merchOrders.confirmIntro(ref),
    tickets_html: rows + shipTo,
    tickets_text: itemLines(lines).join("\n"),
    how_to: merchOrders.confirmShipping,
  });
}

async function sendMerchWhatsapp(order: Order, lines: MerchRow[], ref: string, address: string | null) {
  if (!order.customer_phone) throw new Error("La orden no tiene teléfono");
  const number = waNumber(order.customer_phone);
  await evolution("sendText", {
    number,
    text: merchOrders.confirmWhatsapp({
      name: order.customer_name,
      ref,
      items: itemLines(lines),
      total: formatPrice(merchTotal(lines)),
      address,
    }),
  });
  // One photo per design/colour bought (two sizes of the same tee share it).
  const sent = new Set<string>();
  for (const l of lines) {
    const photo = productPhoto(l);
    if (!photo || sent.has(photo)) continue;
    sent.add(photo);
    const p = products.find((x) => x.id === l.item_id);
    await evolution("sendMedia", {
      number,
      mediatype: "image",
      mimetype: "image/jpeg",
      fileName: path.basename(photo),
      caption: [p?.name, merchVariant(p, { model: l.model, color: l.color })].filter(Boolean).join(" · "),
      media: (await publicFile(photo)).toString("base64"),
    });
  }
}

/**
 * Order confirmation to the buyer — email + WhatsApp, each item with the photo of its design/colour.
 * Once per order unless `force` (admin "Reenviar confirmación"). Never throws: stored on the order
 * (merch_confirmed_at when every available channel went out, otherwise merch_confirm_error).
 */
export async function confirmMerch(orderId: string, opts: { force?: boolean } = {}) {
  const merch = await loadMerch(orderId);
  if (!merch || (merch.order.merch_confirmed_at && !opts.force)) return;
  const { order, lines } = merch;
  const ref = orderRef(order.id);
  const address = formatShipping(order.shipping);
  const errors: string[] = [];
  if (order.customer_email)
    await sendMerchEmail(order, lines, ref, address).catch((e) => errors.push(`Correo: ${errText(e)}`));
  if (order.customer_phone)
    await sendMerchWhatsapp(order, lines, ref, address).catch((e) => errors.push(`WhatsApp: ${errText(e)}`));
  if (!order.customer_email && !order.customer_phone) errors.push("La orden no tiene correo ni teléfono");
  if (errors.length) console.error("[notify:merch-confirm]", orderId, errors);
  await db()`
    update orders set
      merch_confirmed_at = ${errors.length ? null : new Date()},
      merch_confirm_error = ${errors.length ? errors.join(" · ").slice(0, 500) : null}
    where id = ${orderId}`;
}

/**
 * WhatsApp to the merch team (merchOrders.notifyWhatsapp) with the order's garments, cut, size,
 * customer and shipping address. Once per order unless `force` (admin "Reenviar aviso").
 * Never throws: the result is stored on the order (merch_notified_at / merch_notify_error).
 */
export async function notifyMerch(orderId: string, opts: { force?: boolean } = {}) {
  const sql = db();
  const merch = await loadMerch(orderId);
  if (!merch || (merch.order.merch_notified_at && !opts.force)) return;
  const { order, lines } = merch;

  const text = merchOrders.message({
    ref: orderRef(order.id),
    date: (order.paid_at ?? new Date()).toLocaleString("es-MX", { timeZone: "America/Chihuahua", dateStyle: "medium", timeStyle: "short" }),
    name: order.customer_name,
    phone: order.customer_phone,
    email: order.customer_email,
    address: formatShipping(order.shipping),
    items: itemLines(lines),
    total: formatPrice(merchTotal(lines)),
    url: new URL("/admin/merch", site.url).toString(),
  });

  try {
    await evolution("sendText", { number: waNumber(merchOrders.notifyWhatsapp), text });
    await sql`update orders set merch_notified_at = now(), merch_notify_error = null where id = ${orderId}`;
  } catch (e) {
    console.error("[notify:merch]", orderId, e);
    await sql`update orders set merch_notify_error = ${errText(e)} where id = ${orderId}`;
  }
}
