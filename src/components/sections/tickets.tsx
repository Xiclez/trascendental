"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/components/cart";
import { Eyes, Orb, Presents } from "@/components/flyer";
import { Magnetic, Section } from "@/components/ui";
import {
  availabilityLabel,
  event,
  formatPrice,
  purchasable,
  salesEndLabel,
  serviceFee,
  tickets as allTiers,
  type LiveTier,
} from "@/content/trascendental";
import { rise, stagger } from "@/lib/motion";

function Status({ tier }: { tier: LiveTier }) {
  const dot = { available: "bg-ink", low: "bg-[var(--accent)]", soldout: "bg-smoke", upcoming: "bg-smoke", closed: "bg-smoke" }[
    tier.availability
  ];
  return (
    <span className="label inline-flex items-center gap-2 text-[10px] text-graphite">
      <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
      {availabilityLabel[tier.availability]}
    </span>
  );
}

/** Public stock indicator: only a percentage, never exact counts. */
function SoldMeter({ tier }: { tier: LiveTier }) {
  if (tier.soldPct == null || !purchasable(tier.availability)) return null;
  return (
    <div className="mt-5">
      <div className="label flex justify-between text-[10px] text-graphite">
        <span>Vendido</span>
        <span className="tabular-nums text-ink">{tier.soldPct}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${tier.name} ${tier.phase}: ${tier.soldPct}% vendido`}
        aria-valuenow={tier.soldPct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-1 bg-rule"
      >
        <div className="h-full bg-ink" style={{ width: `${tier.soldPct}%` }} />
      </div>
    </div>
  );
}

function blockedText(tier: LiveTier) {
  if (tier.availability === "upcoming") {
    const prev = allTiers.find((t) => t.id === tier.opensAfter);
    return prev ? `Se abre al agotarse ${prev.phase}` : "Próximamente";
  }
  return tier.availability === "closed" ? "Venta cerrada" : "Agotado";
}

function Stepper({ value, onChange, label, max }: { value: number; onChange: (n: number) => void; label: string; max: number }) {
  return (
    <div className="flex h-11 items-center border border-rule" role="group" aria-label={label}>
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center disabled:opacity-30"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Restar uno"
      >
        <Minus className="size-3.5" aria-hidden />
      </button>
      <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center disabled:opacity-30"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Sumar uno"
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

function TierCard({ tier }: { tier: LiveTier }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const onSale = purchasable(tier.availability);
  const done = tier.availability === "soldout" || tier.availability === "closed";
  return (
    <motion.article
      variants={rise}
      className={`registered flex flex-col border border-rule bg-card/60 p-6 ${onSale ? "" : "opacity-60"}`}
      aria-labelledby={`tier-${tier.id}`}
    >
      <div className="flex items-center justify-between">
        <span className="label text-[10px] text-graphite">{tier.phase}</span>
        <Status tier={tier} />
      </div>
      <h3 id={`tier-${tier.id}`} className="display mt-6 text-4xl text-ink">
        {tier.name}
      </h3>
      <p className={`display mt-3 text-5xl tabular-nums ${done ? "text-graphite line-through" : "text-ink"}`}>
        {formatPrice(tier.price)}
      </p>
      <p className="label mt-2 text-[9px] text-graphite">+ {serviceFee.label.toLowerCase()}</p>
      {tier.salesEndAt && tier.availability !== "closed" ? (
        <p className="label mt-3 text-[10px] text-graphite">{salesEndLabel(tier.salesEndAt)}</p>
      ) : null}
      <SoldMeter tier={tier} />
      <ul className="mt-6 flex-1 space-y-2 text-sm text-graphite">
        {tier.includes.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden className="text-ink">+</span>
            {line}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex items-center gap-3">
        {!onSale ? (
          <span className="label inline-flex min-h-11 flex-1 items-center justify-center border border-rule px-3 text-center text-[11px] text-graphite">
            {blockedText(tier)}
          </span>
        ) : (
          <>
            <Stepper value={qty} onChange={setQty} max={10} label={`Cantidad de ${tier.name} ${tier.phase}`} />
            <button
              type="button"
              onClick={() => add({ kind: "ticket", id: tier.id }, qty)}
              className="label inline-flex min-h-11 flex-1 items-center justify-center bg-ink text-[11px] text-paper transition-colors hover:bg-ink"
            >
              Agregar
            </button>
          </>
        )}
      </div>
    </motion.article>
  );
}

/** Signature #3 — the VIP credential as a physical object that leans toward the cursor. */
function VipPass({ tier }: { tier: LiveTier }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [10, -10]), { stiffness: 120, damping: 14 });
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-16, 16]), { stiffness: 120, damping: 14 });
  const sheen = useTransform(px, [-0.5, 0.5], ["100% 0%", "0% 0%"]);

  const onMove = (e: React.PointerEvent) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className="relative mx-auto w-[min(78vw,300px)] [perspective:1000px]"
    >
      {/* clip + lanyard */}
      <div aria-hidden className="mx-auto h-12 w-3 bg-gradient-to-b from-transparent via-ink/70 to-ink" />
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        animate={reduced ? undefined : { rotateZ: [-1.2, 1.2, -1.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative aspect-[5/8] overflow-hidden rounded-[18px] border border-[#d9d7d1] bg-[linear-gradient(160deg,#fbfaf8_0%,#efeee9_55%,#f7f6f2_100%)] shadow-[0_40px_70px_-35px_rgba(20,20,20,0.55)]"
      >
        <div aria-hidden className="mx-auto mt-4 h-2.5 w-14 rounded-full bg-paper ring-1 ring-[#cfcdc7]" />
        {/* engraved orb, as on the flyer */}
        <Orb className="pointer-events-none absolute left-1/2 top-[44%] w-[135%] -translate-x-1/2 -translate-y-1/2 text-[#cfcdc7]" />
        <div className="relative flex h-full flex-col items-center px-6 pb-6 pt-5 text-center">
          <Presents size="sm" />
          <p className="display ink-worn mt-3 origin-top scale-y-[1.2] text-[2.35rem] leading-none text-ink">{event.title}</p>
          <p className="numeral mt-3 text-7xl leading-none text-ink">{event.edition}</p>
          <div className="mt-auto w-full">
            <p className="label flex items-center justify-center gap-2 text-[11px] text-ink">
              <Eyes /> {tier.name}
            </p>
            <p className="numeral mt-1 text-2xl text-ink">{event.dateLabel}</p>
            <div aria-hidden className="mt-4 flex h-9 items-end justify-center gap-[3px]">
              {Array.from({ length: 30 }, (_, i) => (
                <span key={i} className="bg-ink" style={{ width: (i * 7) % 3 === 0 ? 3 : 1, height: "100%" }} />
              ))}
            </div>
          </div>
        </div>
        <motion.div aria-hidden className="pass-sheen absolute inset-0" style={{ backgroundPosition: sheen }} />
      </motion.div>
    </div>
  );
}

function Bullets({ items, align }: { items: string[]; align: "left" | "right" }) {
  return (
    <ul className={`space-y-5 text-sm text-ink/85 ${align === "right" ? "md:text-left" : "md:text-right"}`}>
      {items.map((line) => (
        <li key={line} className={`flex items-center gap-3 ${align === "left" ? "md:flex-row-reverse" : ""}`}>
          <span aria-hidden className="text-lg text-ink">+</span>
          {line}
        </li>
      ))}
    </ul>
  );
}

function VipBlock({ tier }: { tier: LiveTier }) {
  const { add } = useCart();
  const half = Math.ceil(tier.includes.length / 2);
  const left = tier.includes.slice(0, half);
  const right = tier.includes.slice(half);

  return (
    <motion.div variants={rise} className="mt-20 border-t border-rule pt-16" aria-labelledby="vip-title">
      <div className="mb-12 text-center">
        <p className="label text-[11px] text-ink">{tier.phase}</p>
        <h3 id="vip-title" className="display ink-worn mt-3 text-[clamp(2.6rem,7vw,5rem)] text-ink">
          {tier.name}
        </h3>
      </div>
      <div className="grid items-center gap-10 md:grid-cols-[1fr_auto_1fr] md:gap-14">
        <div className="order-2 md:order-1">
          <Bullets items={left} align="left" />
        </div>
        <div className="order-1 md:order-2">
          <VipPass tier={tier} />
        </div>
        <div className="order-3">
          <Bullets items={right} align="right" />
        </div>
      </div>
      <div className="mt-12 flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <span className="display text-5xl tabular-nums">{formatPrice(tier.price)}</span>
          <Status tier={tier} />
        </div>
        <p className="label -mt-2 text-[9px] text-graphite">+ {serviceFee.label.toLowerCase()}</p>
        {tier.soldPct != null ? (
          <div className="w-56">
            <SoldMeter tier={tier} />
          </div>
        ) : null}
        <Magnetic>
          <button
            type="button"
            onClick={() => add({ kind: "ticket", id: tier.id })}
            disabled={!purchasable(tier.availability)}
            className="label inline-flex min-h-12 items-center justify-center bg-ink px-10 text-[12px] text-paper transition-colors hover:bg-ink/80 disabled:opacity-40"
          >
            Agregar VIP Pass
          </button>
        </Magnetic>
      </div>
    </motion.div>
  );
}

export function Tickets({ tiers }: { tiers: LiveTier[] }) {
  const tickets = tiers;
  const standard = tickets.filter((t) => !t.featured);
  const vip = tickets.find((t) => t.featured);
  return (
    <Section id="tickets" index="I" title="Tickets" kicker={`${event.dateLabel} · ${event.venue.city}`}>
      <motion.div variants={stagger(0.1)} className="grid gap-4 md:grid-cols-3">
        {standard.map((tier) => (
          <TierCard key={tier.id} tier={tier} />
        ))}
      </motion.div>
      {vip ? <VipBlock tier={vip} /> : null}
      <p className="mt-10 text-center text-xs text-graphite">
        Precios en MXN, impuestos incluidos. Máximo 10 tickets por tipo. Evento +{event.minAge}.
      </p>
    </Section>
  );
}
