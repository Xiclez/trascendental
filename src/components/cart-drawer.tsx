"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, X } from "lucide-react";
import { MAX_PER_LINE, lineInfo, useCart } from "@/components/cart";
import { formatPrice, serviceFee } from "@/content/trascendental";
import { withFee } from "@/lib/fees";
import { easeRise } from "@/lib/motion";

/** The site's single dialog: cart + Stripe Checkout hand-off. */
export function CartDrawer() {
  const { lines, total, open, setOpen, setQuantity, remove } = useCart();
  const panel = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const charge = withFee(total);

  // Escape, focus trap, focus restore, scroll lock.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(panel.current?.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])") ?? []).filter(
        (el) => !el.hasAttribute("disabled"),
      );
    requestAnimationFrame(() => focusables()[0]?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, setOpen]);

  async function checkout() {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map(({ kind, id, quantity, color, size }) => ({ kind, id, quantity, color, size })),
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "No se pudo iniciar el pago.");
      window.location.assign(data.url);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "No se pudo iniciar el pago.");
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[90]">
          <motion.div
            className="absolute inset-0 bg-paper/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-rule bg-card"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.5, ease: easeRise }}
          >
            <div className="flex h-16 items-center justify-between border-b border-rule px-5">
              <h2 id="cart-title" className="label text-[12px] text-ink">
                Tu carrito
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-11 items-center justify-center text-ink"
                aria-label="Cerrar carrito"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {lines.length === 0 ? (
                <p className="py-10 text-sm text-graphite">Tu carrito está vacío. Agrega tickets o merch para continuar.</p>
              ) : (
                <ul className="divide-y divide-rule">
                  {lines.map((line) => {
                    const info = lineInfo(line);
                    if (!info) return null;
                    return (
                      <li key={line.key} className="flex gap-4 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="label text-[10px] text-graphite">{info.meta}</p>
                          <p className="mt-1 font-medium text-ink">{info.name}</p>
                          <p className="mt-1 text-sm text-graphite">{formatPrice(info.price)} c/u</p>
                          <button
                            type="button"
                            onClick={() => remove(line.key)}
                            className="label mt-2 min-h-11 text-[10px] text-graphite underline-offset-4 hover:text-ink hover:underline"
                          >
                            Quitar
                          </button>
                        </div>
                        <div className="flex h-11 items-center border border-rule" role="group" aria-label={`Cantidad de ${info.name}`}>
                          <button
                            type="button"
                            className="inline-flex size-11 items-center justify-center text-ink"
                            onClick={() => setQuantity(line.key, line.quantity - 1)}
                            aria-label="Restar uno"
                          >
                            <Minus className="size-3.5" aria-hidden />
                          </button>
                          <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            className="inline-flex size-11 items-center justify-center text-ink disabled:opacity-30"
                            onClick={() => setQuantity(line.key, line.quantity + 1)}
                            disabled={line.quantity >= MAX_PER_LINE}
                            aria-label="Sumar uno"
                          >
                            <Plus className="size-3.5" aria-hidden />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-rule px-5 py-5">
              {lines.length ? (
                <dl className="mb-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-graphite">Subtotal</dt>
                    <dd className="tabular-nums text-ink">{formatPrice(total)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-graphite">{serviceFee.label}</dt>
                    <dd className="tabular-nums text-ink">{formatPrice(charge.fee)}</dd>
                  </div>
                </dl>
              ) : null}
              <div className="flex items-baseline justify-between border-t border-rule pt-3">
                <span className="label text-[11px] text-graphite">Total</span>
                <span className="display text-3xl tabular-nums">{formatPrice(charge.total)}</span>
              </div>
              <p className="mt-2 text-xs text-graphite">
                {serviceFee.note} Pago seguro con Stripe. El envío de merch se calcula al pagar.
              </p>
              {status === "error" ? (
                <p role="alert" className="mt-3 text-sm text-ink">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                onClick={checkout}
                disabled={lines.length === 0 || status === "loading"}
                className="label mt-4 inline-flex min-h-12 w-full items-center justify-center bg-ink text-[12px] text-paper transition-colors hover:bg-ink/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {status === "loading" ? "Redirigiendo a Stripe…" : "Pagar"}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

/** Mobile-only purchase bar: the ticket CTA is always one tap away. */
export function StickyTicketBar({ from }: { from: number }) {
  const { count, open, setOpen } = useCart();
  if (open) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-rule bg-paper/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:hidden">
      <div className="flex items-center gap-3">
        <a
          href="#tickets"
          className="label inline-flex min-h-12 flex-1 items-center justify-center whitespace-nowrap bg-ink px-3 text-[11px] text-paper"
        >
          Tickets · desde {formatPrice(from)}
        </a>
        {count > 0 ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="label inline-flex min-h-12 items-center whitespace-nowrap border border-ink px-3 text-[11px] text-ink"
          >
            Carrito ({count})
          </button>
        ) : null}
      </div>
    </div>
  );
}
