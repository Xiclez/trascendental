@AGENTS.md

# Trascendental IV — portal oficial (Héctor Chaparro)

Portal del evento Trascendental IV (26.12.26): promoción + venta de tickets y merch con Stripe Checkout,
boletos con QR (correo + WhatsApp) y panel admin. Self-hosted en VPS (Docker + Postgres + Caddy), sin Vercel.
**Fuente de verdad visual: `References/Flyer.jpg`.** Del EPK (https://github.com/Xiclez/hector-chaparro-epk) se heredan
estructura, tokens de movimiento y sistema de secciones; la piel es la del flyer.

## Lenguaje del flyer (no inventar otro)
- Papel blanco ahumado (`--color-paper` + textura fija en `body::before` + shader del hero), tinta negra, polvo de tinta.
- Tipos: Anton (display, estirado `scale-y-[1.22]` + `.ink-worn`), Archivo Expanded (`.label`, captions tipo
  "HECTOR CHAPARRO PRESENTS"), Bodoni Moda (`.numeral`: "IV", fechas, countdown, índices romanos), Inter (cuerpo).
- Motivos en `components/flyer.tsx`: Orb, Portals, Eyes, Presents, Stamps, MicroPrint. En el showcase 3D el orb y los
  portales viven dentro de la escena (`FlyerStage`), porque el canvas está debajo del DOM.
- Rojo SOLO como "los ojos" (`<Eyes/>`, punto de "pocos lugares", foco). Nunca rellenos rojos ni texto rojo.
- Escalera de opacidad (siluetas que ascienden): numerales I→IV, nombres "Por anunciar" del line-up.
- CTAs: negro sólido (`bg-ink text-paper`) o contorno negro.

## Stack
Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Motion for React (librería principal de animación) ·
Three.js + React Three Fiber + @react-three/drei · lucide-react · stripe (server) · postgres (postgres.js v4) ·
qrcode · EmailJS (REST, correo) · Evolution API (WhatsApp, vía fetch).
Sin Lenis ni GSAP: no hay escenas pineadas con scroll. Agregar GSAP/ScrollTrigger SOLO para escenas pineadas.

```bash
npm run dev | typecheck | lint | build
npm run gen:tee      # regenera public/models/tee.glb (placeholder procedural, meshopt)
npm run db:up        # Postgres local en Docker (docker-compose.dev.yml) · db:down · db:reset · db:psql
npm run stripe:listen  # Stripe CLI en Docker → webhooks TEST a localhost:3000 (rechaza claves live)
```

## Estructura
```
src/content/trascendental.ts   TODO el contenido editable: evento, tiers, productos, precios, FAQ, line-up, links
src/lib/motion.ts              tokens RISE / WIPE / DRIFT (heredados del EPK) + wipeLine
src/app/globals.css            design tokens del EPK + tokens IV (ash, ink, red, serif)
src/app/api/checkout/route.ts  reserva cupo en Postgres → crea Stripe Checkout Session; precios SOLO desde content
src/app/api/stripe/webhook     checkout.session.completed/expired → emite boletos + envía QR (after())
src/app/success | cancel       páginas post-pago (success también cumple la orden, idempotente)
src/app/api/qr/[code]          PNG del QR solo
src/app/api/boleto/[code]      JPEG del boleto = arte assets/boletos/{general,vip}.png + QR (el correo lo enlaza, WhatsApp lo envía)
src/app/t/[code]               lo que abre el QR; con sesión de staff muestra "Registrar ingreso"
src/app/scan/                  escáner de accesos con cámara (qr-scanner); cualquier staff (admin o escáner)
src/app/lineup/[slug]          detalle de artista ("Ver detalles"): fotos, bio, redes
src/app/admin/                 login, (panel)/ ventas por fase + órdenes, (panel)/cortesias, (panel)/usuarios; actions.ts = server actions
src/lib/server/                db (pool + esquema), inventory (cupos), orders (ciclo de vida), notify (QR/EmailJS/Evolution),
                               admin-auth (cookie firmada con rol), staff (usuarios, scrypt), ticket-art (sharp), admin-data
src/lib/fees.ts                cargo por servicio (gross-up de la comisión Stripe); lo usan carrito y checkout
src/instrumentation.ts         crea/actualiza el esquema al arrancar el servidor
public/media/historial/       fotos (≤2000 px) y clips (12 s con audio, 1280 px + póster) de ediciones pasadas, del EPK
Dockerfile · docker-compose.yml · deploy/   VPS: Caddy (HTTPS) → web (standalone) → Postgres; backup.sh
src/components/
  cart.tsx / cart-drawer.tsx   carrito (context + localStorage), drawer (único diálogo), barra sticky móvil
  ui.tsx                       Section, Pending, CTA, Magnetic
  snap-track.tsx               hook + controles de carrusel scroll-snap (galería y line-up)
  gallery-carousel.tsx         carrusel de fotos/videos a color (scroll-snap; videos solo corren visibles, botón de sonido y pantalla completa)
  garment.tsx                  ilustración SVG de prenda (imagen de grid + fallback del 3D)
  sections/*                   hero, tickets, merch, project, lineup, faq, footer
  three/gl-root.tsx            carga diferida (idle / IntersectionObserver) + detección WebGL
  three/scene-canvas.tsx       EL ÚNICO <Canvas> (fixed, z-0); cada región 3D es un drei <View>
  three/hero-view.tsx          shader "Horizonte IV" (field-shader.ts)
  three/tee-view.tsx           showcase de playera: GLB + Decal + PresentationControls + coreografía de color
scripts/generate-tee.mjs       genera el GLB placeholder
```

## Convenciones
- Nunca hardcodear copy/precios en componentes: todo en `src/content/trascendental.ts` (marcar `// TODO` lo no confirmado).
- Movimiento: solo RISE / WIPE / DRIFT. Máximo 3 efectos firma: (1) shader hero + título WIPE, (2) playera 3D, (3) credencial VIP con tilt. No agregar más.
- Playera 3D: drag libre en ambos ejes sin límites (handlers propios en tee-view, sin PresentationControls); al soltar hay inercia, vuelve a posición vertical y el autospin regresa con fade.
- Hover magnético solo en CTAs primarios de compra. Parallax de mouse solo en el orb del hero.
- `prefers-reduced-motion`: todo respeta `useReducedMotion()` (incluye turntable, tilt y shader congelado) + reglas CSS globales.
- WebGL: un solo Canvas. Nuevas escenas = nuevo `<View>` cargado con next/dynamic(ssr:false). Las capas estáticas usan
  `.gl-fallback[data-for=…]` y se ocultan cuando el View llama `markReady()`.
- Móvil: dpr ≤ 1.5, sin antialias, ContactShadows con frames=1 y resolución baja.
- Accesibilidad: targets ≥ 44px, radios nativos para color/talla, foco visible con `--accent`, diálogo con focus trap.
- Stripe: claves en `.env.local` / `.env` (ver `.env.example`), nunca en el repo. Producción en LIVE mode;
  probar con sk_test_ en local antes de tocar el flujo de cobro.
- Correo: EmailJS con plantilla `deploy/emailjs-template.html` ({{{tickets_html}}}); máx. 50 KB de variables, 1 req/s.
- Ventas: fases secuenciales (`opensAfter`): Early Bird $300/100 → Fase 1 $350/386 → Fase 2 $400 sin cupo hasta
  `salesEndAt` (23.12.26). VIP $900/50 en paralelo. El cupo se consume con órdenes pagadas + checkouts pendientes no expirados
  (35 min), bajo `pg_advisory_xact_lock`. Cortesías NO consumen cupo. `availability: "soldout"` cierra a mano.
- Público ve SOLO % vendido (`soldPct`, nunca 100% si queda algo); cantidades exactas solo en /admin.
  Los mensajes de error del checkout tampoco revelan cuántos quedan.
- Boletos: se emiten SOLO en `fulfillCheckoutSession` (idempotente; webhook + success). Un QR por boleto → `/t/{code}`.
  Entrega por canal con `*_sent_at` / `*_error` en `orders`; el admin puede "Reenviar".
- Staff: admin maestro = usuario `admin` + `ADMIN_PASSWORD`; demás cuentas en `staff_users` (rol `admin` o `scanner`).
  Páginas/acciones del panel llaman `requireAdmin()` (el escáner es redirigido a /scan); /scan y check-in llaman `requireStaff()`.
- Cargo por servicio: `serviceFee` en content (Stripe MX 3.6% + $3 + IVA) → `feeFor()`; una línea extra en Stripe y
  `orders.service_fee`. Los ingresos del admin son netos (order_lines).
- Merch: mockups 4:5 en public/media/merch/{producto}/{color}-{front|back}.jpg (`photos` vía `mockups()`), con switch
  Frente/Espalda y `merchCopy.mockupNote`. El showcase 3D suma las vistas de foto encima del View.
- Line-up: `lineup` en content (slug, b2b, fotos en public/media/lineup/{slug}/, bio, socials). `photo: null` = placeholder.
- Código en `src/lib/server/*` es solo de servidor: nunca importarlo desde un client component.
