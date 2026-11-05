import { dbConfigured } from "@/lib/server/db";
import { qrPng } from "@/lib/server/notify";
import { findTicket } from "@/lib/server/orders";

/**
 * GET /api/qr/IV-XXXX-XXXX-XXXX — the ticket's QR as PNG, linked from the email
 * (EmailJS can't embed images and mail clients block data: URIs). Only existing tickets.
 */
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.replace(/\.png$/i, "").toUpperCase();
  if (!dbConfigured() || !/^IV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return new Response(null, { status: 404 });
  const ticket = await findTicket(code);
  if (!ticket) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(await qrPng(ticket.code)), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
