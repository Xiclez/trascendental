"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Native scroll-snap carousel behaviour shared by the gallery and the line-up:
 * tracks which slides are visible, the active index, and prev/next that keep
 * advancing on rapid clicks. Slides must be `li[data-index]` children of `track`.
 */
export function useSnapTrack(count: number) {
  const track = useRef<HTMLUListElement>(null);
  const [visible, setVisible] = useState<Set<number>>(() => new Set());
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  // Target of an in-flight smooth scroll, so rapid clicks keep advancing instead of repeating.
  const pending = useRef<number | null>(null);

  useEffect(() => {
    const root = track.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          const next = new Set(prev);
          for (const e of entries) {
            const i = Number((e.target as HTMLElement).dataset.index);
            if (e.intersectionRatio >= 0.6) next.add(i);
            else next.delete(i);
          }
          if (next.size) setActive(Math.min(...next));
          // Fallback for browsers without `scrollend` (older Safari): arrived = no longer pending.
          if (pending.current != null && next.has(pending.current)) pending.current = null;
          return next;
        });
      },
      { root, threshold: [0, 0.6, 1] },
    );
    root.querySelectorAll("li[data-index]").forEach((li) => io.observe(li));
    return () => io.disconnect();
  }, [count]);

  useEffect(() => {
    const root = track.current;
    if (!root) return;
    const clear = () => (pending.current = null);
    root.addEventListener("scrollend", clear);
    return () => root.removeEventListener("scrollend", clear);
  }, []);

  const go = (dir: -1 | 1) => {
    const root = track.current;
    const index = Math.max(0, Math.min(count - 1, (pending.current ?? active) + dir));
    const target = root?.querySelector<HTMLElement>(`li[data-index="${index}"]`);
    if (!root || !target) return;
    pending.current = index;
    root.scrollTo({ left: target.offsetLeft - root.offsetLeft, behavior: reduced ? "auto" : "smooth" });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    go(e.key === "ArrowRight" ? 1 : -1);
  };

  return { track, visible, active, go, onKeyDown };
}

export const trackClass =
  "flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const pad = (n: number) => String(n).padStart(2, "0");

/** "01 / 06" counter + prev/next buttons under a track. */
export function SnapControls({
  active,
  visible,
  go,
  count,
}: {
  active: number;
  visible: Set<number>;
  go: (dir: -1 | 1) => void;
  count: number;
}) {
  return (
    <div className="mt-5 flex items-center justify-between gap-4">
      <p className="numeral text-xl tabular-nums text-ink" aria-live="polite">
        {pad(active + 1)} <span className="text-graphite">/ {pad(count)}</span>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={active === 0}
          aria-label="Anterior"
          className="inline-flex size-11 items-center justify-center border border-rule text-ink transition-colors hover:border-ink disabled:opacity-30"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={visible.has(count - 1)}
          aria-label="Siguiente"
          className="inline-flex size-11 items-center justify-center border border-rule text-ink transition-colors hover:border-ink disabled:opacity-30"
        >
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
