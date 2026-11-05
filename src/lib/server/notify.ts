import QRCode from "qrcode";
import { contact, delivery, event, flyer, site, tickets as tiers } from "@/content/trascendental";
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
  const service = process.env.EMAILJS_SERVICE_ID;
  const template = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  if (!service || !template || !publicKey || !privateKey)
    throw new Error("EmailJS no configurado (EMAILJS_SERVICE_ID / _TEMPLATE_ID / _PUBLIC_KEY / _PRIVATE_KEY)");
  if (!order.customer_email) throw new Error("La orden no tiene correo");

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
          subject: delivery.emailSubject,
          presenter: event.presenter,
          event_title: event.title,
          event_edition: event.edition,
          event_date: event.dateLong,
          event_date_label: event.dateLabel,
          event_doors: event.doorsLabel,
          event_city: event.venue.city,
          event_venue: `${event.venue.name}, ${event.venue.city}`,
          event_address: event.venue.address,
          preheader: delivery.emailPreheader(list.length),
          greeting: order.customer_name ? `Hola ${order.customer_name.split(" ")[0]},` : "Hola,",
          intro,
          tickets_html: ticketsHtml,
          tickets_text: ticketsText,
          how_to: delivery.howTo,
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
