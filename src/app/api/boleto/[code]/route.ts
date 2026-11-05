import { dbConfigured } from "@/lib/server/db";
import { ticketUrl } from "@/lib/server/notify";
import { findTicket } from "@/lib/server/orders";
import { ticketImage } from "@/lib/server/ticket-art";

/**
 * GET /api/boleto/IV-XXXX-XXXX-XXXX — the full ticket artwork with its QR (JPEG), linked from
 * the email and offered as a download on /t/[code]. Only existing tickets.
 */
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.replace(/\.jpe?g$/i, "").toUpperCase();
  if (!dbConfigured() || !/^IV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return new Response(null, { status: 404 });
  const ticket = await findTicket(code);
  if (!ticket) return new Response(null, { status: 404 });
  const jpg = await ticketImage(ticket.code, ticket.tier_id, ticketUrl(ticket.code));
  return new Response(new Uint8Array(jpg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `inline; filename="${ticket.code}.jpg"`,
      "Cache-Control": "private, max-age=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
