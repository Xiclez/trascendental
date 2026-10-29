import Image from "next/image";
import { event, flyer } from "@/content/trascendental";

/**
 * FLYER MOTIFS — every decorative element on the site is lifted from
 * References/Flyer.jpg so the page reads as the poster unfolded:
 *   Orb       thin graphite globe linework behind the central figure
 *   Portals   the receding mirror panels flanking the figure
 *   Eyes      the two red points — the ONLY red on the site
 *   Presents  "\\\C. HECTOR CHAPARRO PRESENTS" lockup
 *   Stamps    the three badges in the flyer's bottom-right corner
 *   MicroPrint the fine-print manifesto in the bottom-left corner
 */

export function Orb({ className = "" }: { className?: string }) {
  const meridians = [0.18, 0.42, 0.64, 0.84];
  return (
    <svg viewBox="0 0 1000 1000" className={className} aria-hidden fill="none" stroke="currentColor">
      <circle cx="500" cy="500" r="490" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <circle cx="500" cy="530" r="430" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.8" />
      <circle cx="500" cy="560" r="360" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.6" />
      {meridians.map((k) => (
        <ellipse key={k} cx="500" cy="500" rx={490 * k} ry="490" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.7" />
      ))}
      <ellipse cx="500" cy="500" rx="490" ry="120" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.5" />
    </svg>
  );
}

/** Receding mirror panels, mirrored on both sides of a centre gap. */
export function Portals({ className = "", gap = 90 }: { className?: string; gap?: number }) {
  const panels = [0, 1, 2, 3].flatMap((i) =>
    [-1, 1].map((s) => {
      const w = 64 - i * 6;
      const cx = 500 + s * (gap + i * 78);
      const h = 600 - i * 95;
      const inner = cx - (s * w) / 2;
      const outer = cx + (s * w) / 2;
      const top = 500 - h / 2;
      const bottom = 500 + h / 2;
      const pts = `${inner},${top} ${outer},${top + 34} ${outer},${bottom - 34} ${inner},${bottom}`;
      return <polygon key={`${s}-${i}`} points={pts} opacity={1 - i * 0.18} />;
    }),
  );
  return (
    <svg
      viewBox="0 0 1000 1000"
      className={className}
      aria-hidden
      fill="rgba(247,246,243,0.72)"
      stroke="currentColor"
      strokeWidth="1"
      vectorEffect="non-scaling-stroke"
    >
      {panels}
    </svg>
  );
}

export function Eyes({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`eyes ${className}`}>
      <span />
      <span />
    </span>
  );
}

export function Presents({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-2.5" : "h-[clamp(0.8rem,1.6vw,1.25rem)]";
  const text = size === "sm" ? "gap-1.5 text-[6.5px] tracking-[0.1em]" : "gap-2.5 text-[10px] sm:text-[13px] md:text-[15px]";
  return (
    <p className={`label flex items-center justify-center whitespace-nowrap text-ink ${text} ${className}`}>
      <Image src="/brand/hc-mark.png" alt="" width={226} height={113} className={`${h} w-auto`} />
      <span>
        <strong className="font-extrabold">Hector Chaparro</strong> <span className="font-normal">presents</span>
      </span>
    </p>
  );
}

export function Stamps({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 text-ink ${className}`} aria-label="Sellos de la edición">
      <svg viewBox="0 0 40 36" className="h-8 w-auto" role="img" aria-label={`Edición ${event.edition}`}>
        <polygon points="20,1 39,35 1,35" fill="currentColor" />
        <text x="20" y="31" textAnchor="middle" fontSize="9" fill="#ebeae6" fontFamily="Times New Roman, serif">
          {event.edition}
        </text>
      </svg>
      <svg viewBox="0 0 34 36" className="h-8 w-auto" role="img" aria-label="Sello Trascendental">
        <rect x="1" y="1" width="32" height="34" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <ellipse cx="17" cy="16" rx="8.5" ry="10.5" fill="currentColor" />
        <ellipse cx="13.4" cy="16.5" rx="2.6" ry="1.5" fill="#e0141c" transform="rotate(20 13.4 16.5)" />
        <ellipse cx="20.6" cy="16.5" rx="2.6" ry="1.5" fill="#e0141c" transform="rotate(-20 20.6 16.5)" />
      </svg>
      <span className="label inline-flex h-8 items-center rounded-[50%] border-[1.6px] border-current px-4 text-[11px] tracking-[0.08em]">
        {flyer.stamp}
      </span>
    </div>
  );
}

export function MicroPrint({ className = "" }: { className?: string }) {
  return <p className={`max-w-[17rem] text-[7.5px] leading-[1.35] text-graphite ${className}`}>{flyer.microprint}</p>;
}
