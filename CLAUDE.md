@AGENTS.md

# Trascendental IV — portal oficial (Héctor Chaparro)

Portal del evento Trascendental IV (26.12.26): promoción + venta de tickets y merch con Stripe Checkout.
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
Three.js + React Three Fiber + @react-three/drei · lucide-react · stripe (server).
Sin Lenis ni GSAP: no hay escenas pineadas con scroll. Agregar GSAP/ScrollTrigger SOLO para escenas pineadas.

```bash
npm run dev | typecheck | lint | build
npm run gen:tee      # regenera public/models/tee.glb (placeholder procedural, meshopt)
```

## Estructura
```
src/content/trascendental.ts   TODO el contenido editable: evento, tiers, productos, precios, FAQ, line-up, links
src/lib/motion.ts              tokens RISE / WIPE / DRIFT (heredados del EPK) + wipeLine
src/app/globals.css            design tokens del EPK + tokens IV (ash, ink, red, serif)
src/app/api/checkout/route.ts  crea Stripe Checkout Session; precios SOLO desde content
src/app/success | cancel       páginas post-pago
src/components/
  cart.tsx / cart-drawer.tsx   carrito (context + localStorage), drawer (único diálogo), barra sticky móvil
  ui.tsx                       Section, Pending, CTA, Magnetic
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
- Stripe: claves en `.env.local` (ver `.env.example`), nunca en el repo. Modo test.
