/**
 * SINGLE SOURCE OF TRUTH for every editable string, date, price, product and link.
 * Do not hardcode copy inside components — edit it here.
 *
 * Provenance tags:
 *   VERIFIED — printed in the Trascendental IV flyers (References/) or the 2026 EPK press kit
 *   TODO     — placeholder that must be confirmed before launch
 *
 * Prices are whole MXN pesos. The checkout route (/api/checkout) reads ONLY from
 * this file, so a price changed here is the price Stripe charges.
 */

export const currency = "mxn" as const;

export const site = {
  name: "Trascendental IV",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  description:
    "Trascendental IV — Héctor Chaparro presenta la cuarta edición de Trascendental. 26.12.26. Tickets y merch oficial.",
  ogImage: "/images/flyer-iv.jpg", // VERIFIED — copy of References/Flyer.jpg
  epkUrl: "https://hector-chaparro-epk.vercel.app/",
};

/** Flyer furniture (References/Flyer.jpg). */
export const flyer = {
  caption: "More info coming soon", // VERIFIED (flyer)
  stamp: "CHH", // VERIFIED (flyer badge) — TODO confirmar significado / logo oficial
  /** Fine print, bottom-left of the flyer. Copy from the press kit (VERIFIED). */
  microprint:
    "Trascendental es un proyecto de música original, eventos y experiencias diseñado para conectar con la mente, la emoción y la pista de baile. Un viaje electrónico de alta energía diseñado para conectar, elevar y mover al público. Trascender más allá de lo auditivo. I · 22.06.24 — II · 28.12.24 — III · 16.08.25 — IV · 26.12.26.",
};

export const event = {
  presenter: "Héctor Chaparro presents", // VERIFIED (flyer)
  title: "TRASCENDENTAL",
  edition: "IV",
  dateLabel: "26.12.26", // VERIFIED (flyer)
  dateLong: "Sábado 26 de diciembre de 2026",
  /** ISO with offset. Hour TODO — 21:00 hora de Chihuahua (UTC−6) asumida. */
  startsAt: "2026-12-26T21:00:00-06:00",
  endsAt: "2026-12-27T05:00:00-06:00", // TODO
  doorsLabel: "Puertas 21:00", // TODO
  tagline: "Trascender más allá de lo auditivo.", // VERIFIED (press kit)
  intro:
    "La cuarta edición del viaje electrónico de Héctor Chaparro: álbum original, line-up curado y una producción pensada para conectar, elevar y mover a la pista.",
  venue: {
    name: "Venue por anunciar", // TODO
    city: "Chihuahua", // TODO — ciudad base del EPK, sin confirmar para IV
    region: "Chihuahua",
    country: "MX",
    address: "Dirección por anunciar", // TODO
    mapUrl: null as string | null, // TODO
  },
  minAge: 18, // TODO — confirmar política
};

export type Availability = "available" | "low" | "soldout";

export type TicketTier = {
  id: string;
  name: string;
  phase: string;
  price: number;
  availability: Availability;
  includes: string[];
  featured?: boolean;
};

/** TODO — nombres, precios, cupos y beneficios son placeholders. */
export const tickets: TicketTier[] = [
  {
    id: "early-bird",
    name: "Early Bird",
    phase: "Fase 0",
    price: 450,
    availability: "soldout",
    includes: ["Acceso general", "Precio de preventa"],
  },
  {
    id: "general-1",
    name: "General",
    phase: "Fase 1",
    price: 600,
    availability: "low",
    includes: ["Acceso general", "Pista principal"],
  },
  {
    id: "general-2",
    name: "General",
    phase: "Fase 2",
    price: 750,
    availability: "available",
    includes: ["Acceso general", "Pista principal"],
  },
  {
    id: "vip",
    name: "VIP Pass",
    phase: "Cupo limitado",
    price: 1500,
    availability: "available",
    featured: true,
    includes: [
      "Acceso preferente sin fila",
      "Zona VIP con vista al booth",
      "Barra exclusiva",
      "Credencial física Trascendental IV",
      "Playera oficial IV incluida",
    ],
  },
];

export const availabilityLabel: Record<Availability, string> = {
  available: "Disponible",
  low: "Pocos lugares",
  soldout: "Agotado",
};

export type MerchColor = {
  id: string;
  name: string;
  /** Fabric colour of the 3D model + illustration. */
  fabric: string;
  /** Print colour of the Trascendental IV decal. */
  ink: string;
};

export type Product = {
  id: string;
  name: string;
  blurb: string;
  price: number;
  /** "tee" | "hoodie" draw the illustrated garment; anything else uses `image`. */
  kind: "tee" | "hoodie" | "print";
  image?: string;
  colors?: MerchColor[];
  sizes?: string[];
  details: string[];
  available: boolean;
};

const garmentColors: MerchColor[] = [
  { id: "blanco", name: "Blanco", fabric: "#f4f3ef", ink: "#151515" }, // default — the IV tee is white
  { id: "negro", name: "Negro", fabric: "#1d1d21", ink: "#ebeae6" },
];

/** TODO — productos, precios y tallas son placeholders. */
export const products: Product[] = [
  {
    id: "tee-iv",
    name: "Playera Trascendental IV",
    blurb: "Algodón peinado, corte regular. Estampado frontal IV.",
    price: 550,
    kind: "tee",
    colors: garmentColors,
    sizes: ["S", "M", "L", "XL", "XXL"],
    details: ["100% algodón 220 g", "Serigrafía al frente", "Corte regular unisex", "Edición limitada IV"],
    available: true,
  },
  {
    id: "hoodie-iv",
    name: "Hoodie Trascendental IV",
    blurb: "Felpa pesada, capucha doble. Bordado IV.",
    price: 1100,
    kind: "hoodie",
    colors: garmentColors.slice(0, 2),
    sizes: ["S", "M", "L", "XL"],
    details: ["Felpa 380 g", "Bordado al pecho", "Corte oversize"],
    available: true,
  },
  {
    id: "poster-iv",
    name: "Póster oficial IV",
    blurb: "Arte oficial del flyer en impresión giclée.",
    price: 350,
    kind: "print",
    image: "/images/flyer-iv.jpg",
    sizes: ["45×56 cm"],
    details: ["Papel algodón 310 g", "Numerado a mano"],
    available: true,
  },
];

/** The 3D showcase. Swap `model` for a real garment GLB (Draco or meshopt). */
export const showcase = {
  productId: "tee-iv",
  model: "/models/tee.glb", // TODO — placeholder procedural (scripts/generate-tee.mjs)
  print: "/brand/trascendental-iv-print.png", // TODO — logo oficial IV pendiente
  poster: "/images/flyer-iv.jpg",
};

/** VERIFIED — EPK press kit (chapters). */
export const editions = [
  {
    numeral: "I",
    date: "22 JUN 2024",
    status: "Álbum I · Sold Out",
    accent: "#4C6EF5",
    description:
      "La primera edición marcó el inicio del movimiento. La convocatoria superó el límite del venue y el evento fue clausurado por la policía.",
    artwork: "/images/trascendental-i.jpg",
    listen: "https://open.spotify.com/album/45bmccdMfM2fwRhcaxrRXu",
  },
  {
    numeral: "II",
    date: "28 DIC 2024",
    status: "Álbum II · Sold Out",
    accent: "#E8195F",
    description:
      "Tras el impacto de la primera edición, Héctor creó un segundo álbum y llevó el concepto a una nueva experiencia.",
    artwork: "/images/trascendental-ii.jpg",
    listen: "https://open.spotify.com/album/1dK3h0riO6RKxgYposR029",
  },
  {
    numeral: "III",
    date: "16 AGO 2025",
    status: "Álbum III · Producción expandida",
    accent: "#10D9A0",
    description:
      "La tercera edición elevó el proyecto con mayor producción, escenario y cinco DJs nacionales, duplicando la asistencia anterior.",
    artwork: "/images/trascendental-iii.jpg",
    listen: "https://open.spotify.com/album/07moGxbi3p6isje1rsD1zD",
  },
] as const;

/** VERIFIED — EPK press kit bio. */
export const project = {
  title: "El proyecto",
  lead: "Trascendental es un proyecto de música original, eventos y experiencias diseñado para conectar con la mente, la emoción y la pista de baile.",
  body: [
    "Héctor Chaparro es un DJ y productor mexicano que fusiona tech house, techno, psytrance e indie dance en un sonido propio, energético e inmersivo.",
    "Cada edición nace de un álbum original y se presenta como una sola pieza: música, line-up, escenario y dirección visual.",
  ],
  stats: [
    { value: "3", label: "Álbumes publicados" },
    { value: "2", label: "Ediciones sold out" },
    { value: "130–160", label: "BPM" },
  ],
};

export type Artist = { name: string; role: string; confirmed: boolean };

/** TODO — line-up por anunciar. Héctor Chaparro es el único nombre confirmado. */
export const lineup: Artist[] = [
  { name: "Héctor Chaparro", role: "Headliner · Live album IV", confirmed: true },
  { name: "Por anunciar", role: "Invitado nacional", confirmed: false },
  { name: "Por anunciar", role: "Invitado nacional", confirmed: false },
  { name: "Por anunciar", role: "Invitado especial", confirmed: false },
  { name: "Por anunciar", role: "Warm-up", confirmed: false },
];

/** TODO — políticas placeholder; validar con legal / venue. */
export const faq = [
  {
    q: "¿Cómo accedo al evento?",
    a: "Tras tu compra recibirás un correo con tu ticket digital. Preséntalo en tu celular junto con una identificación oficial en la entrada.",
  },
  {
    q: "¿Hay edad mínima?",
    a: `El evento es exclusivo para mayores de ${event.minAge} años. Se solicitará identificación oficial vigente en el acceso.`,
  },
  {
    q: "¿Puedo pedir reembolso?",
    a: "Los tickets no son reembolsables salvo cancelación o cambio de fecha del evento. Si eso ocurre, te contactaremos al correo de compra.",
  },
  {
    q: "¿Dónde es?",
    a: "La sede se anunciará muy pronto en este sitio y en Instagram. Todos los tickets son válidos para la sede final.",
  },
  {
    q: "¿Cuándo llega mi merch?",
    a: "La merch se envía a domicilio en 5–10 días hábiles. La playera incluida en el VIP Pass se entrega en el evento.",
  },
];

/** VERIFIED — EPK booking & links. */
export const contact = {
  email: "hjca75@hotmail.com",
  instagram: "@hectorchaparromusic",
  instagramUrl: "https://instagram.com/hectorchaparromusic",
};

export const socials = [
  { label: "Instagram", href: contact.instagramUrl },
  { label: "Spotify", href: "https://open.spotify.com/album/07moGxbi3p6isje1rsD1zD" },
  { label: "Apple Music", href: "https://music.apple.com/us/album/trascendental-3/1834617510" },
  { label: "EPK", href: site.epkUrl },
];

export const nav = [
  { href: "#tickets", label: "Tickets" },
  { href: "#merch", label: "Merch" },
  { href: "#proyecto", label: "Proyecto" },
  { href: "#lineup", label: "Line-up" },
  { href: "#faq", label: "FAQ" },
];

export const formatPrice = (pesos: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(pesos);
