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
  // SITE_URL is read at runtime on the server (QR links, emails, Stripe redirects), so a build
  // without the NEXT_PUBLIC_ build arg can't bake "localhost" into tickets. Used server-side only.
  // Pages prerendered at build (line-up) bake this into their link previews, and the VPS build
  // doesn't see SITE_URL — so production falls back to the real domain, never to localhost.
  url: (
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production" ? "https://trascendental.hectorchaparro.com" : "http://localhost:3000")
  ).replace(/\/$/, ""),
  description:
    "Héctor Chaparro presenta la cuarta edición de Trascendental. 26.12.26 · Pistoleros House of Shows, Chihuahua. Boletos y merch oficial.",
  /** Link previews (WhatsApp, iMessage, X, Facebook): 1200×630, from the ticket artwork. */
  ogImage: "/images/og-iv.jpg",
  ogImageAlt: "Trascendental IV — Héctor Chaparro presents",
  /** Vertical flyer (VERIFIED — copy of References/Flyer.jpg): schema.org and the merch poster. */
  flyer: "/images/flyer-iv.jpg",
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
  /** ISO with offset. Apertura de puertas, 19:00 hora de Chihuahua (UTC−6). Lo usan el countdown y el schema.org. */
  startsAt: "2026-12-26T19:00:00-06:00",
  endsAt: "2026-12-27T05:00:00-06:00", // TODO
  doorsLabel: "Puertas 19:00", // VERIFIED (organizador)
  tagline: "Trascender más allá de lo auditivo.", // VERIFIED (press kit)
  intro:
    "La cuarta edición del viaje electrónico de Héctor Chaparro: álbum original, line-up curado y una producción pensada para conectar, elevar y mover a la pista.",
  venue: {
    name: "Pistoleros House of Shows", // VERIFIED (arte del boleto, assets/boletos)
    city: "Chihuahua", // VERIFIED (arte del boleto)
    region: "Chihuahua",
    country: "MX",
    address: "Dirección por anunciar", // TODO
    mapUrl: null as string | null, // TODO
  },
  minAge: 18, // TODO — confirmar política
};

/**
 * available / low — se puede comprar · soldout — cupo agotado (o cerrada a mano)
 * upcoming — la fase anterior aún no se agota · closed — terminó su ventana de venta
 */
export type Availability = "available" | "low" | "soldout" | "upcoming" | "closed";

export type TicketTier = {
  id: string;
  name: string;
  phase: string;
  price: number;
  /**
   * Manual state. "soldout" closes the phase by hand; otherwise the live state is
   * computed from the database (src/lib/server/inventory.ts).
   */
  availability: Availability;
  /** Max tickets sold in this phase (paid + reserved checkouts). null = no cap. Courtesies don't count. */
  capacity: number | null;
  /** Sequential phases: this tier only opens once the tier with this id is sold out. */
  opensAfter?: string;
  /** ISO with offset. Sales stop at this moment. */
  salesEndAt?: string;
  includes: string[];
  featured?: boolean;
  /** Ticket artwork in assets/boletos/ that the QR is stamped onto (email + WhatsApp). */
  art: "general" | "vip";
};

/**
 * A tier merged with live stock. Public pages only get a rounded percentage —
 * exact counts stay in /admin.
 */
export type LiveTier = TicketTier & { soldPct: number | null };

/** Sold percentage at or above which a phase shows "Pocos lugares". */
export const lowStockPct = 85;

/** General admission sells in order: Early Bird → Fase 1 → Fase 2. VIP sells in parallel. */
export const tickets: TicketTier[] = [
  {
    id: "early-bird",
    name: "Early Bird",
    phase: "Fase 0",
    price: 300,
    availability: "available",
    capacity: 100,
    includes: ["Acceso general", "Precio de preventa", "Limitado a 100 accesos"],
    art: "general",
  },
  {
    id: "general-1",
    name: "General",
    phase: "Fase 1",
    price: 350,
    availability: "available",
    capacity: 386,
    opensAfter: "early-bird",
    includes: ["Acceso general", "Pista principal"],
    art: "general",
  },
  {
    id: "general-2",
    name: "General",
    phase: "Fase 2",
    price: 400,
    availability: "available",
    capacity: null, // sin límite de boletos, solo por tiempo
    opensAfter: "general-1",
    salesEndAt: "2026-12-23T23:59:59-06:00", // 3 días antes del evento
    includes: ["Acceso general", "Pista principal", "Tiempo limitado"],
    art: "general",
  },
  {
    id: "vip",
    name: "VIP Pass",
    phase: "Cupo limitado",
    price: 900,
    availability: "available",
    capacity: 50,
    featured: true,
    art: "vip",
    includes: [
      "Acceso preferente sin fila",
      "Zona VIP con vista al booth",
      "Barra exclusiva",
      "Credencial física Trascendental IV",
    ],
  },
];

/**
 * Cargo por servicio = comisión de Stripe trasladada al comprador, para que el organizador reciba
 * el precio publicado completo. Stripe MX (stripe.com/en-mx/pricing, verificado 11/2026):
 * 3.6% + MX$3 por cobro con tarjeta nacional, más IVA (16%) sobre la comisión.
 * Tarjetas internacionales (+0.5%) y conversión de moneda (+2%) NO se cubren: quedan a cargo del organizador.
 */
export const serviceFee = {
  label: "Cargo por servicio",
  note: "Comisión de procesamiento de pago (Stripe + IVA). El precio del boleto llega íntegro al evento.",
  percent: 0.036,
  fixed: 3,
  tax: 0.16,
};

export const availabilityLabel: Record<Availability, string> = {
  available: "Disponible",
  low: "Pocos lugares",
  soldout: "Agotado",
  upcoming: "Próximamente",
  closed: "Venta cerrada",
};

export const purchasable = (a: Availability) => a === "available" || a === "low";

/** "Hasta el 23 dic" for time-limited phases. */
export const salesEndLabel = (iso: string) =>
  `Hasta el ${new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "America/Chihuahua" }).format(new Date(iso))}`;

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
  /** Designs to choose from (like colour and size). The first one is the default. */
  models?: ProductModel[];
  colors?: MerchColor[];
  sizes?: string[];
  details: string[];
  available: boolean;
};

/** A print on the 3D tee: transparent PNG + where it sits, in tee.glb geometry units (x, y = centre; scale = w, h). */
export type TeePrint = { src: string; position: [number, number]; scale: [number, number] };

export type ProductModel = {
  id: string;
  name: string;
  blurb: string;
  /** Mockup photos per colour id: public/media/merch/{folder}/{color}-{front|back}.jpg (4:5). */
  photos: Record<string, { front: string; back: string }>;
  /**
   * Artwork per colour for the 3D showcase: public/media/merch/prints/{id}-{color}-{front|back}.png,
   * extracted from the mockups. Placement measured on the same mockups (prints are centred: x = 0).
   */
  prints: Record<string, { front: TeePrint; back: TeePrint }>;
};

const mockupPhotos = (folder: string, colors: MerchColor[]) =>
  Object.fromEntries(
    colors.map((c) => [c.id, { front: `/media/merch/${folder}/${c.id}-front.jpg`, back: `/media/merch/${folder}/${c.id}-back.jpg` }]),
  );

type Placement = { front: [y: number, w: number, h: number]; back: [y: number, w: number, h: number] };
const teePrints = (model: string, placement: Record<string, Placement>) =>
  Object.fromEntries(
    Object.entries(placement).map(([color, p]) => [
      color,
      Object.fromEntries(
        (["front", "back"] as const).map((side) => [
          side,
          { src: `/media/merch/prints/${model}-${color}-${side}.png`, position: [0, p[side][0]], scale: [p[side][1], p[side][2]] },
        ]),
      ) as { front: TeePrint; back: TeePrint },
    ]),
  );

export const merchCopy = {
  model: "Modelo",
  front: "Frente",
  back: "Espalda",
  view3d: "3D",
  /** Shown under every mockup photo. */
  mockupNote:
    "Imagen de referencia generada digitalmente. El tono de la tela y del estampado puede variar ligeramente según la pantalla.",
};

const garmentColors: MerchColor[] = [
  { id: "blanco", name: "Blanco", fabric: "#f4f3ef", ink: "#151515" }, // default — the IV tee is white
  { id: "negro", name: "Negro", fabric: "#1d1d21", ink: "#ebeae6" },
];

/** TODO — productos, precios y tallas son placeholders. */
export const products: Product[] = [
  {
    // VERIFIED — 2 diseños × 2 colores (References/merch/). TODO — precio, tallas y tela.
    id: "tee-iv",
    name: "Playera Trascendental IV",
    blurb: "Dos diseños, dos colores. Estampado al frente y en la espalda.",
    price: 499,
    kind: "tee",
    colors: garmentColors,
    models: [
      {
        id: "portales", // TODO — nombre oficial del diseño
        name: "Portales",
        blurb: "Al frente, TRASCENDENTAL IV. En la espalda, el arte del flyer: el orbe, los portales y los ojos.",
        photos: mockupPhotos("tee-portales", garmentColors),
        prints: teePrints("portales", {
          blanco: { front: [0.451, 0.268, 0.163], back: [0.037, 0.935, 1.24] },
          negro: { front: [0.447, 0.27, 0.164], back: [0.024, 0.917, 1.249] },
        }),
      },
      {
        id: "ascension", // TODO — nombre oficial del diseño
        name: "Ascensión",
        blurb: "Al frente, TRASCENDENTAL. En la espalda, cinco siluetas que ascienden hacia la luz.",
        photos: mockupPhotos("tee-ascension", garmentColors),
        prints: teePrints("ascension", {
          blanco: { front: [0.506, 0.281, 0.097], back: [0.062, 0.413, 1.48] },
          negro: { front: [0.5, 0.285, 0.098], back: [0.063, 0.426, 1.438] },
        }),
      },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    details: ["Corte oversize unisex", "Estampado al frente y en la espalda", "Edición limitada IV"],
    available: true,
  },
  {
    id: "hoodie-iv",
    name: "Hoodie Trascendental IV",
    blurb: "Felpa pesada, capucha doble. Bordado IV.",
    price: 800,
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
    price: 50,
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

export type GalleryItem =
  | { type: "image"; src: string; alt: string; edition: string | null }
  | { type: "video"; src: string; poster: string; alt: string; edition: string | null };

/**
 * Carrusel "Galería" de la sección Proyecto. Material del EPK (public/images/historia-*, public/video/hector*),
 * optimizado en public/media/historial/. Videos: 12 s (desde el seg. 3 del original), con audio AAC, 1280 px.
 * TODO — asignar `edition` ("I" | "II" | "III") a cada pieza; mientras sea null no se muestra numeral.
 */
export const gallery: GalleryItem[] = [
  { type: "video", src: "/media/historial/video-1.mp4", poster: "/media/historial/video-1.jpg", alt: "Pista llena frente a la cabina con el letrero Trascendental", edition: null },
  { type: "image", src: "/media/historial/foto-1.jpg", alt: "Pantalla con el nombre de Héctor Chaparro sobre el público", edition: null },
  { type: "video", src: "/media/historial/video-2.mp4", poster: "/media/historial/video-2.jpg", alt: "Público con las manos arriba bajo luces verdes", edition: null },
  { type: "image", src: "/media/historial/foto-2.jpg", alt: "Héctor Chaparro en la cabina con luz magenta", edition: null },
  { type: "video", src: "/media/historial/video-3.mp4", poster: "/media/historial/video-3.jpg", alt: "La pista vista desde atrás de la cabina", edition: null },
  { type: "image", src: "/media/historial/foto-3.jpg", alt: "Público alrededor de la cabina durante el set", edition: null },
  { type: "video", src: "/media/historial/video-4.mp4", poster: "/media/historial/video-4.jpg", alt: "Luces moradas y público grabando el set", edition: null },
  { type: "image", src: "/media/historial/foto-4.jpg", alt: "Héctor Chaparro frente al público con luz violeta", edition: null },
  { type: "video", src: "/media/historial/video-5.mp4", poster: "/media/historial/video-5.jpg", alt: "Público en contraluz bajo un reflector", edition: null },
  { type: "image", src: "/media/historial/foto-5.jpg", alt: "Vista desde la cabina hacia una pista llena entre humo", edition: null },
  { type: "video", src: "/media/historial/video-6.mp4", poster: "/media/historial/video-6.jpg", alt: "Cabina con pantalla de logotipos y público al frente", edition: null },
];

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

export type Artist = {
  /** URL of the detail page: /lineup/{slug} */
  slug: string;
  name: string;
  /** Slug of the B2B partner (who has their own entry, next to this one). Both share one box in the line-up. */
  b2b?: string;
  role: string;
  billing: "headliner" | "special" | "local";
  /** Card photo (portrait, ≥ 900 px tall). null → typographic placeholder until the photo arrives. */
  photo: string | null;
  /** Extra photos for the detail page. Put them in public/media/lineup/{slug}/. */
  photos: { src: string; alt: string; aspect?: string }[];
  /** Clips for the detail page (with sound, native controls). `aspect` as CSS, e.g. "3/4". */
  videos?: { src: string; poster: string; alt: string; aspect: string }[];
  /** "Tech House / Melodic House" — shown under the name on the detail page. */
  genres?: string;
  /** Short facts for the detail page ("Fundador de DUNAR", "Se ha presentado en…"). */
  highlights?: { label: string; text: string }[];
  bio: string[];
  socials: { label: string; href: string }[];
};

/**
 * Line-up IV (VERIFIED — organizador + arte del boleto). Orden = orden de la cartelera.
 * Cada artista tiene su propia entrada y página; las parejas B2B van juntas y se apuntan con `b2b`.
 */
export const lineup: Artist[] = [
  {
    slug: "hector-chaparro",
    name: "Héctor Chaparro",
    role: "Headliner · Creador de Trascendental",
    billing: "headliner",
    photo: "/media/lineup/hector-chaparro/retrato.jpg",
    photos: [
      { src: "/media/lineup/hector-chaparro/hero-artist-1.jpg", alt: "Retrato de Héctor Chaparro" },
      { src: "/media/historial/foto-2.jpg", alt: "Héctor Chaparro en la cabina con luz magenta" },
      { src: "/media/historial/foto-4.jpg", alt: "Héctor Chaparro frente al público con luz violeta" },
      { src: "/media/historial/foto-1.jpg", alt: "Pantalla con el nombre de Héctor Chaparro sobre el público" },
      { src: "/media/historial/foto-5.jpg", alt: "Vista desde la cabina hacia una pista llena entre humo" },
    ],
    bio: [
      "DJ y productor mexicano, creador de Trascendental: un proyecto de música original, eventos y experiencias que fusiona tech house, techno, psytrance e indie dance en un sonido propio, energético e inmersivo.",
      "Cada edición nace de un álbum original. En IV presenta en vivo el cuarto capítulo del viaje.",
    ],
    socials: [
      { label: "Instagram", href: "https://instagram.com/hectorchaparromusic" },
      { label: "Spotify", href: "https://open.spotify.com/album/07moGxbi3p6isje1rsD1zD" },
      { label: "EPK", href: "https://hector-chaparro-epk.vercel.app/" },
    ],
  },
  {
    // VERIFIED — media kit (References/artists/carlos-belcast/). Fotos de sus redes: TODO pedir originales y créditos.
    // TODO — el kit marca por confirmar si "Amants Perdus" / "Mírame" (2026) son de este BELCAST; no se mencionan aquí.
    slug: "carlos-belcast",
    name: "Carlos Belcast",
    role: "Headliner",
    billing: "special",
    genres: "Hardstyle / Hyper",
    photo: "/media/lineup/carlos-belcast/retrato.jpg",
    photos: [
      { src: "/media/lineup/carlos-belcast/retrato-naranja.jpg", alt: "Retrato de Carlos Belcast con lentes en la mano sobre fondo naranja", aspect: "1/1" },
      { src: "/media/lineup/carlos-belcast/gym.jpg", alt: "Carlos Belcast con mancuernas en el gimnasio", aspect: "4/5" },
    ],
    bio: [
      "DJ y productor mexicano detrás de BELCAST, proyecto de hardstyle, hyper y remixes de clásicos pop y EDM con estética de gimnasio. Sus sets llevan la intensidad del entrenamiento a la pista: puro BPM para “tronar vena”.",
      "Suma más de 37 millones de streams en Spotify y firmó junto a Velabeats “JUST FUCKING DANCE”, el himno detrás de uno de sus trends más virales. Fuera de la cabina es uno de los creadores fitness más influyentes de habla hispana: más de 13 millones de seguidores, atleta oficial de Gymshark y representante de México en La Velada del Año 5.",
    ],
    highlights: [
      { label: "Proyecto musical", text: "BELCAST: hardstyle, hyper y remixes con energía de gimnasio. 37M+ streams en Spotify. Su primer DJ set fue en Miami Lift." },
      {
        label: "Lanzamientos",
        text: "JUST FUCKING DANCE (con Velabeats, track insignia) · I WANNA GO (HARD-STYLE) (remix de Britney Spears, con Velabeats) · EVOLUTION y ROSAS (HYPER) (con Velabeats) · UNHOLY (con dnvn) · Tokyo Drift y STEREO LOVE ULTRA FUNK (con ZODIVK) · LIGHTNING IN THE DARK.",
      },
      { label: "Colaboraciones", text: "Velabeats, su productor de cabecera · ZODIVK · dnvn · LAID x BELCAST (con David Laid) · BELCAST x ANDONI." },
      { label: "Curaduría", text: "Su playlist “BELCAST - GYM PLAYLIST” en Spotify suma 148.9K guardados." },
      { label: "Fuera de la cabina", text: "13M+ seguidores en TikTok, Instagram y YouTube · Atleta oficial de Gymshark, con colección propia (2026) · La Velada del Año 5 (Sevilla, 2025)." },
    ],
    socials: [
      { label: "Spotify", href: "https://open.spotify.com/artist/4fSRUQ3o9t33hv8MFyGo7Z" },
      { label: "Instagram", href: "https://instagram.com/carlosbelcast" },
      { label: "TikTok", href: "https://www.tiktok.com/@carlosbelcast" },
      { label: "YouTube", href: "https://youtube.com/@carlosbelcast" },
    ],
  },
  {
    // VERIFIED — press kit 2026 (References/artists/pato-shoucair/). Fotos recortadas del mismo PDF.
    slug: "pato-shoucair",
    name: "Pato Shoucair",
    role: "Headliner",
    billing: "special",
    genres: "Electrónica melódica",
    photo: "/media/lineup/pato-shoucair/retrato.jpg",
    photos: [
      { src: "/media/lineup/pato-shoucair/edc-cabina.jpg", alt: "Pato Shoucair en la cabina del XX Stage de EDC México frente al público", aspect: "2/3" },
      { src: "/media/lineup/pato-shoucair/edc-escenario.jpg", alt: "Escenario XX Stage de EDC México lleno, con pirotecnia", aspect: "4/5" },
      { src: "/media/lineup/pato-shoucair/retrato-rojo.jpg", alt: "Retrato de Pato Shoucair sobre fondo rojo", aspect: "4/5" },
    ],
    bio: [
      "Artista, DJ y productor mexicano de música electrónica que ha construido un proyecto en el que la emoción es el punto de partida. Su propuesta combina producciones melódicas con DJ sets intensos y envolventes, creando una conexión genuina con el público tanto dentro como fuera de la pista de baile.",
      "Con más de 125 millones de reproducciones, más de 60 presentaciones y 40 shows sold out, ha llevado su música a escenarios de México, Colombia, Guatemala, España y Países Bajos. Entre los momentos más importantes de su carrera destacan sus presentaciones consecutivas en EDC México 2025 y 2026, donde tocó en el XX Stage a máxima capacidad.",
    ],
    highlights: [
      { label: "En cifras", text: "125M+ reproducciones · 60+ presentaciones en vivo · 40 shows sold out · 467K oyentes mensuales en Spotify · 48M+ visualizaciones en YouTube." },
      { label: "Presentaciones destacadas", text: "EDC México 2025 y 2026 (XX Stage, aforo completo) · México, Colombia, Guatemala, España y Países Bajos · Confirmado en 2026: Festival Water Castle y Feria de Zacatecas." },
      { label: "Último álbum", text: "MITOSIS (17.07.26), su proyecto más personal: un álbum bilingüe en dos facetas, La Herida y La Cicatriz, sobre vulnerabilidad, sanación, identidad y transformación. 13.5M+ reproducciones." },
      { label: "Nuevo capítulo", text: "Pato Shoucair · Belcast: proyecto de ocho canciones de electrónica melódica con Belcast. Lanzamientos: Amants Perdus (ya disponible) y Silence After You (11.09.26)." },
      { label: "Socios de la industria", text: "Virgin · Sony Music." },
    ],
    socials: [
      { label: "Instagram", href: "https://instagram.com/pato_shoucair" },
      { label: "Spotify", href: "https://open.spotify.com/artist/5PBJkBd4ipAxK7D36jkJNC" },
      { label: "SoundCloud", href: "https://soundcloud.com/user-410132279" },
      { label: "TikTok", href: "https://www.tiktok.com/@patoshoucair" },
      { label: "Sitio web", href: "https://www.patoshoucair.com" },
    ],
  },
  {
    // VERIFIED — media kit (References/artists/Velabeats/). Fotos de sus redes: TODO pedir originales y créditos.
    // TODO — Instagram, ciudad base y fechas en vivo (el kit no las tiene).
    slug: "vela-beats",
    name: "Vela Beats",
    role: "Headliner",
    billing: "special",
    genres: "Hardstyle / Hyper / House",
    photo: "/media/lineup/vela-beats/retrato.jpg",
    photos: [
      { src: "/media/lineup/vela-beats/estudio.jpg", alt: "Velabeats produciendo en un teclado MIDI en su estudio", aspect: "4/5" },
      { src: "/media/lineup/vela-beats/muro.jpg", alt: "Velabeats de pie en la esquina de un muro de ladrillo", aspect: "1/1" },
    ],
    bio: [
      "Velabeats es el proyecto del DJ y productor Adrián Vela Solares, compositor y productor en todos sus créditos. Empezó en el lo-fi con discos en el sello Mellow y hoy produce hardstyle, hyper y house.",
      "Es el productor detrás de BELCAST, el proyecto musical de Carlos Belcast: juntos firmaron “JUST FUCKING DANCE”, el himno de uno de los trends gym más virales en español. En 2026 abre una etapa house con Pato Shoucair y BELCAST.",
    ],
    highlights: [
      {
        label: "Trayectoria",
        text: "Lo-fi (2020–2023): EPs instrumentales en Mellow y un sencillo lo-fi jazz en Kindbrew Records · Hardstyle y hyper con BELCAST (2023–2024) · House (2026), con Pato Shoucair y BELCAST.",
      },
      {
        label: "Lanzamientos",
        text: "Mírame y Amants Perdus (2026, con Pato Shoucair y BELCAST) · EVOLUTION · ROSAS (HYPER) · I WANNA GO (HARD-STYLE) · JUST FUCKING DANCE (track insignia) · Raw Cuts, Gloomy Day y Late Night Tape (EPs lo-fi, Mellow).",
      },
      { label: "Colaboraciones", text: "BELCAST · Pato Shoucair · Francely Abreuu · Twuan." },
    ],
    socials: [
      { label: "Spotify", href: "https://open.spotify.com/artist/7JY2JDS3flgpRm8rrpss5W" },
      { label: "TikTok", href: "https://www.tiktok.com/@velabeats" },
    ],
  },
  {
    slug: "loops-roja",
    name: "Loops (Roja)",
    b2b: "alex-fierro",
    role: "Talento local · B2B",
    billing: "local",
    // VERIFIED — media kit (References/artists/loops/). Fotos de su Instagram: TODO pedir originales y créditos.
    genres: "Psytrance / Twilight · House / Techno como Roja",
    photo: "/media/lineup/loops-roja/retrato.jpg",
    photos: [
      { src: "/media/lineup/loops-roja/festival.jpg", alt: "Loop's tocando en una cabina Pioneer DJ al aire libre bajo luces de colores", aspect: "3/4" },
      { src: "/media/lineup/loops-roja/bosque.jpg", alt: "Retrato de Lupita Rojas frente a un bosque en llamas", aspect: "3/4" },
      { src: "/media/lineup/loops-roja/campo.jpg", alt: "Lupita Rojas con lentes neón señalando a cámara en un campo", aspect: "3/4" },
    ],
    bio: [
      "Loop's es el proyecto de Lupita Rojas, DJ y productora de Chihuahua enfocada en el psytrance y el twilight. Desde 2025 ha tocado en las fiestas psy más activas de la ciudad, de Psy Wonderland y The Secret Circle en Epicentro Foro a Monoparty V, y ha llevado su sonido a otras plazas del país.",
      "Como Roja explora su lado house y techno, un terreno que ya probó en vivo con su Techno Live en Creel. Sus sets combinan energía psicodélica con una presencia cercana y festiva en cabina: una de las voces femeninas que impulsan la escena psy del norte de México.",
    ],
    highlights: [
      { label: "Dos proyectos", text: "Loop's (psytrance / twilight), su proyecto principal · Roja (house / techno), proyecto paralelo." },
      {
        label: "Presentaciones",
        text: "Halloween Monoparty V · Psychedelic Experience: Girl Power · Camino a Raíces 2 · Psy Wonderland (Epicentro Foro) · The Secret Circle (Zulu, con sesión grabada para YouTube) · Yumari · Noches de Saico · Contest Atmosphere (Sheraton Soberano) · Loading Collective (Studiobar) · Techno Live como Roja (Creel).",
      },
      { label: "Ha compartido cartel con", text: "Creative Mind, Drastiko, Unfollow, Nava Kozz, Ubezleb, Mirrno, Neoving, Tejedk, Lixx, Saget, Yul's y Ever Tapia." },
    ],
    socials: [
      { label: "Instagram", href: "https://instagram.com/loopsroja" },
      { label: "SoundCloud", href: "https://soundcloud.com/loop-s-rojas" },
    ],
  },
  {
    slug: "alex-fierro",
    name: "Alex Fierro",
    b2b: "loops-roja",
    role: "Talento local · B2B",
    billing: "local",
    // VERIFIED — media kit (References/artists/alexfierro/). Fotos de su Instagram: TODO pedir originales y créditos.
    genres: "Psytech / Techno",
    photo: "/media/lineup/alex-fierro/retrato.jpg",
    photos: [
      { src: "/media/lineup/alex-fierro/cabina.jpg", alt: "Alex Fierro en la cabina frente a visuales azules", aspect: "1/1" },
      { src: "/media/lineup/alex-fierro/sudadera.jpg", alt: "Retrato de Alex Fierro con sudadera negra y capucha", aspect: "1/1" },
    ],
    bio: [
      "DJ de psytech y techno de Chihuahua. En cabina lleva la misma energía con la que entrena: sets intensos y de buena vibra, pensados para no soltar la pista.",
      "Ha tocado recientemente en las ediciones de Psyline Records en Epicentro y Zulu, dos de los venues clave de la escena electrónica de la ciudad. Fuera de la cabina es coach en BioGym y una cara conocida de la comunidad fitness de Chihuahua.",
    ],
    highlights: [{ label: "Presentaciones", text: "Psyline Records en Epicentro y en Zulu, Chihuahua (psytech / techno)." }],
    socials: [
      { label: "Instagram", href: "https://instagram.com/alexfierro11" },
      { label: "TikTok", href: "https://www.tiktok.com/@alexfierro11" },
    ],
  },
  {
    // VERIFIED — press kit 2026 (References/artists/diasdeariel/). Nombre oficial en minúsculas, una palabra.
    slug: "diasdeariel",
    name: "diasdeariel",
    b2b: "maumi",
    role: "Talento local · B2B",
    billing: "local",
    genres: "Tech House / Melodic House / Afro House",
    photo: "/media/lineup/diasdeariel/retrato.jpg",
    photos: [{ src: "/media/lineup/diasdeariel/retrato-byn.jpg", alt: "Retrato de diasdeariel en blanco y negro", aspect: "2/3" }],
    videos: [
      { src: "/media/lineup/diasdeariel/video-1.mp4", poster: "/media/lineup/diasdeariel/video-1.jpg", alt: "diasdeariel en la cabina al aire libre", aspect: "1/1" },
      { src: "/media/lineup/diasdeariel/video-2.mp4", poster: "/media/lineup/diasdeariel/video-2.jpg", alt: "diasdeariel tocando en DUNAR frente al público", aspect: "3/4" },
      { src: "/media/lineup/diasdeariel/video-3.mp4", poster: "/media/lineup/diasdeariel/video-3.jpg", alt: "diasdeariel en la cabina con luz baja", aspect: "3/4" },
    ],
    bio: [
      "DJ mexicano de Chihuahua que conecta el groove del Tech House con la energía del Melodic House y el Afro House. Sus sets se construyen con atención al momento, al espacio y a la pista.",
      "Ha abierto para artistas como WURTZ (Afterlife).",
    ],
    highlights: [
      {
        label: "Proyecto propio",
        text: "Fundador de DUNAR, marca de eventos de música electrónica reconocida en Chihuahua, que ha reunido público local y talento nacional en una propuesta centrada en la música y la pista.",
      },
      {
        label: "Presentaciones",
        text: "Chihuahua (Zulu Cocktail & Lounge, Studio Bar, Epicentro Foro) · Tulum (Radio Tulum, Azulik) · Guadalajara (Fauno Bar, Sauna Disco, Tito Club) · Mazatlán (Bruma, 404) · Nayarit (Nayan Senses).",
      },
    ],
    socials: [
      { label: "Instagram", href: "https://instagram.com/diasdeariel" },
      { label: "SoundCloud", href: "https://soundcloud.com/diasdeariel" },
      { label: "YouTube", href: "https://youtube.com/@diasdeariel" },
      { label: "DUNAR", href: "https://instagram.com/dunar.music" },
    ],
  },
  {
    // VERIFIED — media kit 2026 (References/artists/maumi/). Fotos de su Instagram: TODO pedir originales y créditos.
    // TODO — el kit marca por confirmar: nombre completo, ciudad base, año de inicio, géneros y relación con Baby Grooves.
    slug: "maumi",
    name: "maumi",
    b2b: "diasdeariel",
    role: "El Paso, TX · B2B",
    billing: "local",
    genres: "House · DJ y live set", // TODO confirmar géneros (sus carteles lo ubican en noches de house)
    photo: "/media/lineup/maumi/retrato.jpg",
    photos: [
      { src: "/media/lineup/maumi/auto.jpg", alt: "maumi con audífonos y laptop en el asiento trasero de un auto", aspect: "3/4" },
      { src: "/media/lineup/maumi/selfie.jpg", alt: "maumi con gorra y lentes oscuros en un auto con techo panorámico", aspect: "3/4" },
    ],
    bio: [
      "Productor musical que se presenta con dos palabras: sexy sounds. Su trabajo empieza en el estudio, entre sintetizadores, consola y Ableton, y termina en la cabina, donde presenta su música en formato DJ y live set.",
      "En 2026 abrió para Tom & Collins en The Baths, en Austin, durante el fin de semana del Gran Premio de Estados Unidos de Fórmula 1. Antes, en marzo, firmó su propia noche con line-up invitado en Stanton House, El Paso.",
    ],
    highlights: [
      { label: "Sonido", text: "Productor antes que DJ: trabaja en estudio con hardware y Ableton, y lleva su material a la cabina en live set además del DJ set." },
      {
        label: "Presentaciones",
        text: "Race Weekend Party en The Baths, Austin (23.10.26, soporte de Tom & Collins junto a Aner, Kike y Lagunes) · maumi + guest line up en Stanton House, El Paso (14.03.26) · Baby Grooves, El Paso (28.11.26).",
      },
    ],
    socials: [
      { label: "Instagram", href: "https://instagram.com/maumimusic" },
      { label: "Linktree", href: "https://linktr.ee/maumimusic" },
      { label: "Baby Grooves", href: "https://instagram.com/babygroovesofficial" },
    ],
  },
  {
    // VERIFIED — EPK https://delareiver-presskit.vercel.app/ (fotos y video del artista: References/artists/de-la-reiver/).
    slug: "de-la-reiver",
    name: "De La Reiver",
    b2b: "moreno",
    role: "Talento local · B2B",
    billing: "local",
    genres: "Tech House / House",
    photo: "/media/lineup/de-la-reiver/retrato.jpg",
    photos: [
      { src: "/media/lineup/de-la-reiver/padrino.jpg", alt: "De La Reiver con gorra y lentes bajo una estructura metálica con luz violeta", aspect: "2/3" },
      { src: "/media/lineup/de-la-reiver/graffiti.jpg", alt: "De La Reiver frente a un muro de graffiti", aspect: "3/2" },
      { src: "/media/lineup/de-la-reiver/kiosco.jpg", alt: "De La Reiver en cuclillas bajo un kiosco iluminado de noche", aspect: "2/3" },
    ],
    videos: [
      { src: "/media/lineup/de-la-reiver/video-1.mp4", poster: "/media/lineup/de-la-reiver/video-1.jpg", alt: "De La Reiver en la cabina de Sensory Groove con luces rojas", aspect: "16/9" },
      { src: "/media/lineup/de-la-reiver/video-2.mp4", poster: "/media/lineup/de-la-reiver/video-2.jpg", alt: "De La Reiver en la cabina de Sensory Groove frente a la pista, entre láseres violetas", aspect: "1080/404" },
    ],
    bio: [
      "DJ emergente de la escena electrónica, influenciado por el tech house y la cultura rave. Su estilo destaca por grooves profundos, bajos potentes y una energía envolvente que conecta con la pista.",
      "Cada set está diseñado como una experiencia fluida, donde la energía evoluciona de manera natural y controlada, manteniendo siempre una identidad sobria y profunda dentro de la pista.",
    ],
    highlights: [
      { label: "Proyecto propio", text: "Creador de Sensory Groove (I y II)." },
      { label: "Presentaciones", text: "Studio Bar · Epicentro · Zulu · After del After · Beer Garden · Ambar · Mezcalería El Camino · El Cuervo · Roxy · afters, raves y fiestas underground." },
      {
        label: "Colaboraciones",
        text: "Kevin Van Reken, Beto Ramos, Los Grandes, Tota, DaxikleZ, Divixxion, Merry Pop, Fleck, diasdeariel, Jauregui, Zamorano, Jach, Sol MX, Valentin Romero, VPM, Guillermo Nevarez, Andy Quid, Rebel ID, Alex Lozduar, Carlos Duran y Uruk.",
      },
    ],
    socials: [
      { label: "Instagram", href: "https://www.instagram.com/de_la_reiver/" },
      { label: "SoundCloud", href: "https://soundcloud.com/suisrap1986" },
    ],
  },
  {
    // VERIFIED — media kit 2026 (References/artists/moreno/). Fotos de su Instagram: TODO pedir originales y créditos.
    // TODO — el kit marca por confirmar: nombre completo, edad, año de inicio y lista completa de residencias.
    slug: "moreno",
    name: "Moreno",
    b2b: "de-la-reiver",
    role: "Talento local · B2B",
    billing: "local",
    genres: "Open Format / Bass Music",
    photo: "/media/lineup/moreno/retrato.jpg",
    photos: [
      { src: "/media/lineup/moreno/red-bull.jpg", alt: "Moreno con audífonos y lentes naranjas en la cabina frente a un letrero de Red Bull", aspect: "3/4" },
      { src: "/media/lineup/moreno/mirador.jpg", alt: "Moreno recargado en un poste en un mirador sobre la ciudad de Chihuahua", aspect: "3/4" },
    ],
    bio: [
      "Moreno, también conocido como Moreno MX, es un DJ de Chihuahua. Empezó a los 15 años en fiestas, bares y antros de la ciudad, y en su primer año de residencias ya sumaba más de cinco venues, entre ellos Dembow CUU y Back Room.",
      "Su set cruza dos mundos: el formato abierto que llena la pista (reggaetón, trap latino y el pop que todos corean) y una vena de bass music (dubstep, riddim, brostep) que lo ha puesto en los line-ups electrónicos del Outdoor Stage de Zulu, en fechas producidas junto a Psyline Records y Loading Collective.",
    ],
    highlights: [
      { label: "Dos sets", text: "Club / open format: reggaetón, trap latino, perreo, pop y throwbacks · Rave / bass: dubstep, riddim y brostep." },
      {
        label: "Presentaciones",
        text: "Pop Up Rave · Viva La Dance (19.09.26) · CODE:08, Zulu Outdoor Stage (14.08.26, slot principal) · Sabina Palma: Øverride, Zulu Outdoor Stage (06.06.26, Psyline Records × Loading Collective) · Una Noche en Familia, Zulu Cocktail & Lounge (07.11.25).",
      },
      { label: "Venues y plazas", text: "Zulu · Level · Normal CUU · Dembow CUU · Back Room · R14 Club · Opal Night · Crypto TRC · Puerto Vallarta." },
    ],
    socials: [
      { label: "Instagram", href: "https://instagram.com/morenomxdj" },
      { label: "TikTok", href: "https://www.tiktok.com/@morenomxdj" },
      { label: "SoundCloud", href: "https://soundcloud.com/morenomxdj" },
    ],
  },
];

export const lineupCopy = {
  kicker: "+ DJ Contest", // VERIFIED (arte del boleto)
  details: "Ver detalles",
  noBio: "Semblanza próximamente.",
  noPhoto: "Foto próximamente",
  back: "Volver al line-up",
};

export const artistBySlug = (slug: string) => lineup.find((a) => a.slug === slug);

/** The line-up as billed: one slot per solo act, one per B2B pair (in the order of the first of the two). */
export const lineupSlots: Artist[][] = lineup.reduce<Artist[][]>((slots, a) => {
  if (slots.some((slot) => slot.includes(a))) return slots;
  const partner = a.b2b ? artistBySlug(a.b2b) : undefined;
  return [...slots, partner ? [a, partner] : [a]];
}, []);

/** "Loops (Roja) B2B Alex Fierro" — for the marquee, alt text and metadata. */
export const slotName = (slot: Artist[]) => slot.map((a) => a.name).join(" B2B ");

/** TODO — políticas placeholder; validar con legal / venue. */
export const faq = [
  {
    q: "¿Cómo accedo al evento?",
    a: "Al confirmarse tu pago recibirás tus boletos con código QR por correo y por WhatsApp (un QR por persona). Preséntalo en tu celular junto con una identificación oficial en la entrada.",
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
    a: `En ${event.venue.name}, ${event.venue.city}, ${event.venue.region}. La dirección exacta y los accesos se publican aquí y en Instagram.`, // TODO — dirección
  },
  {
    q: "¿Cuándo llega mi merch?",
    a: "La merch se envía a domicilio en 5–10 días hábiles.",
  },
];

/** Copy of the ticket delivery (email + WhatsApp). One QR per ticket. */
export const delivery = {
  emailSubject: `Tus boletos · ${event.title} ${event.edition} · ${event.dateLabel}`,
  emailIntro: "Tu compra está confirmada. Cada código QR es un acceso individual: compártelo solo con quien vaya a usarlo.",
  emailCourtesyIntro: "Tienes una cortesía para Trascendental IV. Cada código QR es un acceso individual.",
  /** Inbox preview text (hidden in the body). */
  emailPreheader: (n: number) =>
    `${n === 1 ? "Tu boleto" : `Tus ${n} boletos`} para ${event.title} ${event.edition} · ${event.dateLabel}. Presenta el QR en la entrada.`,
  howTo: `Presenta tu QR en el celular junto con una identificación oficial. Evento +${event.minAge}.`,
  whatsappGreeting: (name: string | null) =>
    `${name ? `Hola ${name.split(" ")[0]}, ` : ""}aquí están tus boletos para *${event.title} ${event.edition}* · ${event.dateLong}.`,
  whatsappCaption: (label: string, code: string, i: number, n: number) =>
    `*${event.title} ${event.edition}* — ${label}
Boleto ${i} de ${n} · ${code}
Presenta este QR con identificación oficial.`,
};

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
  { href: "#lineup", label: "Line-up" },
  { href: "#tickets", label: "Tickets" },
  { href: "#merch", label: "Merch" },
  { href: "#proyecto", label: "Proyecto" },
  { href: "#faq", label: "FAQ" },
];

export const formatPrice = (pesos: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(pesos);
