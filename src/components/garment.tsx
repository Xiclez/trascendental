import { useId } from "react";

/**
 * Static garment illustration. Used as the product image in the merch grid and
 * as the loading / no-WebGL fallback of the 3D showcase, so it shares the
 * print asset and colour tokens with the 3D model.
 */
export function Garment({
  kind,
  fabric,
  ink,
  print,
  className = "",
}: {
  kind: "tee" | "hoodie";
  fabric: string;
  ink: string;
  print: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const tee =
    "M150 46 Q200 78 250 46 L332 70 L392 148 L346 180 L318 154 L322 404 Q200 416 78 404 L82 154 L54 180 L8 148 L68 70 Z";
  const hoodie =
    "M146 70 Q200 98 254 70 L330 84 L372 170 L396 352 L352 362 L322 214 L326 410 Q200 422 74 410 L78 214 L48 362 L4 352 L28 170 L70 84 Z";
  const printBox = kind === "tee" ? { x: 128, y: 118, w: 144, h: 90 } : { x: 166, y: 150, w: 68, h: 42 };

  return (
    <svg viewBox="0 0 400 430" className={className} role="presentation" aria-hidden>
      <defs>
        <radialGradient id={`shade-${id}`} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="70%" stopColor="#000" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        <mask id={`print-${id}`}>
          <image href={print} x={printBox.x} y={printBox.y} width={printBox.w} height={printBox.h} preserveAspectRatio="xMidYMid meet" />
        </mask>
      </defs>
      {kind === "hoodie" ? (
        <path d="M146 70 Q150 10 200 8 Q250 10 254 70 Q200 52 146 70 Z" fill={fabric} />
      ) : null}
      <path d={kind === "tee" ? tee : hoodie} fill={fabric} />
      <path d={kind === "tee" ? tee : hoodie} fill={`url(#shade-${id})`} />
      {kind === "tee" ? (
        <path d="M150 46 Q200 90 250 46" fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="6" />
      ) : (
        <>
          <path d="M146 70 Q200 112 254 70" fill="none" stroke="#000" strokeOpacity="0.3" strokeWidth="5" />
          <path d="M128 300 L272 300 L290 370 L110 370 Z" fill="none" stroke="#000" strokeOpacity="0.22" strokeWidth="3" />
        </>
      )}
      <rect x="0" y="0" width="400" height="430" fill={ink} mask={`url(#print-${id})`} />
    </svg>
  );
}
