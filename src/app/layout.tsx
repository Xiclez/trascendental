import type { Metadata, Viewport } from "next";
import { Anton, Archivo, Bodoni_Moda, Inter } from "next/font/google";
import { CartProvider } from "@/components/cart";
import { event, site } from "@/content/trascendental";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

/** Flyer captions ("HECTOR CHAPARRO PRESENTS") — wide extended grotesk via the wdth axis. */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** Edition IV numerals ("IV", "26.12.26") — the flyer's Didone serif. */
const bodoni = Bodoni_Moda({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bodoni",
  display: "swap",
});

const title = `${event.title} ${event.edition} · ${event.dateLabel} — Héctor Chaparro`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: title, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: {
    title,
    description: site.description,
    type: "website",
    locale: "es_MX",
    siteName: site.name,
    images: [{ url: site.ogImage, width: 720, height: 900, alt: "Flyer Trascendental IV · 26.12.26" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: site.description,
    images: [site.ogImage],
  },
};

export const viewport: Viewport = {
  themeColor: "#ebeae6",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${anton.variable} ${archivo.variable} ${inter.variable} ${bodoni.variable}`}
    >
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
