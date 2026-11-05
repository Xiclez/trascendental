import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";
import { tickets as tiers } from "@/content/trascendental";

/**
 * The ticket image sent by email and WhatsApp: the tier's artwork (assets/boletos/*.png,
 * 1024×1536) with the QR stamped into its blank white square.
 * The Dockerfile copies assets/ next to server.js, so process.cwd() resolves in prod too.
 */

/** Blank square measured on both artworks: x 360–664, y 798–1108 (≈304 px). QR sits centered inside it. */
const BOX = { cx: 512, cy: 953, qr: 288 };

const artCache = new Map<string, Promise<Buffer>>();
const artwork = (name: string) => {
  let p = artCache.get(name);
  if (!p) {
    p = readFile(path.join(process.cwd(), "assets", "boletos", `${name}.png`));
    p.catch(() => artCache.delete(name)); // retry on the next call if the file was missing
    artCache.set(name, p);
  }
  return p;
};

export async function ticketImage(code: string, tierId: string, url: string) {
  const art = tiers.find((t) => t.id === tierId)?.art ?? "general";
  const [base, qr] = await Promise.all([
    artwork(art),
    QRCode.toBuffer(url, {
      type: "png",
      width: BOX.qr,
      margin: 1, // the white box around it is the rest of the quiet zone
      errorCorrectionLevel: "M",
      color: { dark: "#151515", light: "#ffffff" },
    }),
  ]);
  const size = (await sharp(qr).metadata()).width ?? BOX.qr;
  return sharp(base)
    .composite([{ input: qr, left: Math.round(BOX.cx - size / 2), top: Math.round(BOX.cy - size / 2) }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}
