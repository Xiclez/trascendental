"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type QrScannerType from "qr-scanner";
import { scanTicket, type ScanResult } from "@/app/admin/actions";
import { btn, field } from "@/app/admin/styles";
import { Eyes } from "@/components/flyer";

/**
 * Camera QR scanner for the door. Uses qr-scanner (native BarcodeDetector when the
 * browser has it, a Web Worker decoder otherwise — works on iOS Safari). Camera access
 * needs HTTPS (or localhost). Each read calls the scanTicket server action, which checks
 * the ticket in atomically, so two doors can't let the same QR in twice.
 */

const OK_RESUME_MS = 1800;
const SAME_CODE_MS = 8000;

const headline = { ok: "Acceso válido", used: "Ya ingresó", invalid: "Rechazado", notfound: "No encontrado" } as const;

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

export function Scanner() {
  const video = useRef<HTMLVideoElement>(null);
  const scanner = useRef<QrScannerType | null>(null);
  const busy = useRef(false);
  const last = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [camera, setCamera] = useState<"starting" | "on" | "error">("starting");
  const [cameraError, setCameraError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [admitted, setAdmitted] = useState(0);
  const [pending, startTransition] = useTransition();

  const resume = useCallback(() => {
    setResult(null);
    busy.current = false;
  }, []);

  const check = useCallback(
    (raw: string) => {
      if (busy.current) return;
      const now = Date.now();
      // The camera reads the same QR several times per second: ignore repeats.
      if (raw === last.current.code && now - last.current.at < SAME_CODE_MS) return;
      last.current = { code: raw, at: now };
      busy.current = true;
      startTransition(async () => {
        let r: ScanResult;
        try {
          r = await scanTicket(raw);
        } catch {
          r = { status: "notfound", code: raw.slice(0, 60), detail: "Sin conexión con el servidor. Intenta de nuevo." };
        }
        setResult(r);
        setHistory((h) => [r, ...h].slice(0, 12));
        if (r.status === "ok") {
          setAdmitted((n) => n + 1);
          vibrate(90);
          setTimeout(resume, OK_RESUME_MS);
        } else {
          vibrate([220, 90, 220]);
        }
      });
    },
    [resume],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: QrScanner } = await import("qr-scanner");
      if (cancelled || !video.current) return;
      const s = new QrScanner(video.current, (res) => check(res.data), {
        preferredCamera: "environment",
        maxScansPerSecond: 8,
        highlightScanRegion: false,
        highlightCodeOutline: false,
        returnDetailedScanResult: true,
      });
      scanner.current = s;
      try {
        await s.start();
        if (!cancelled) setCamera("on");
      } catch (e) {
        if (cancelled) return;
        setCamera("error");
        setCameraError(
          String(e).includes("NotAllowed") || String(e).includes("permission")
            ? "Permiso de cámara denegado. Actívalo en la configuración del navegador y recarga."
            : "No se pudo abrir la cámara. Usa HTTPS y un navegador actualizado, o escribe el código abajo.",
        );
      }
    })();
    return () => {
      cancelled = true;
      scanner.current?.destroy();
      scanner.current = null;
    };
  }, [check]);

  const tone =
    result?.status === "ok"
      ? "bg-ink text-paper border-ink"
      : "bg-paper text-ink border-ink";

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="relative aspect-square w-full overflow-hidden border border-ink bg-ink">
        <video ref={video} muted playsInline className="absolute inset-0 size-full object-cover" />
        {/* registration marks, like the ticket artwork */}
        <div aria-hidden className="pointer-events-none absolute inset-[14%]">
          {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((c) => (
            <span key={c} className={`absolute size-8 border-paper ${c}`} />
          ))}
        </div>
        {camera !== "on" ? (
          <p className="absolute inset-x-0 bottom-0 bg-paper/90 p-4 text-sm text-ink">
            {camera === "starting" ? "Abriendo cámara…" : cameraError}
          </p>
        ) : null}

        {result ? (
          <div role="alert" className={`absolute inset-0 flex flex-col items-center justify-center border-4 p-6 text-center ${tone}`}>
            {result.status !== "ok" ? <Eyes className="mb-4 text-[2.4rem]" /> : null}
            <p className="display text-[clamp(2.6rem,12vw,4.2rem)] leading-none">{headline[result.status]}</p>
            {"label" in result ? (
              <p className="label mt-4 text-[12px]">
                {result.label}
                {result.courtesy ? " · Cortesía" : ""}
              </p>
            ) : null}
            {"holder" in result && result.holder ? <p className="mt-2 text-lg">{result.holder}</p> : null}
            <p className={`mt-3 text-sm ${result.status === "ok" ? "text-paper/70" : "text-graphite"}`}>{result.detail}</p>
            <p className="mt-2 font-mono text-xs tracking-[0.14em] opacity-70">{result.code}</p>
            {result.status !== "ok" ? (
              <button type="button" onClick={resume} className={`${btn} mt-6 min-h-14 w-full max-w-xs text-[13px]`}>
                Escanear siguiente
              </button>
            ) : null}
          </div>
        ) : pending ? (
          <p className="label absolute inset-x-0 bottom-0 bg-paper/90 p-3 text-center text-[11px] text-ink">Verificando…</p>
        ) : null}
      </div>

      <div className="flex items-baseline justify-between">
        <p className="label text-[10px] text-graphite">Ingresos en este dispositivo</p>
        <p className="numeral text-3xl tabular-nums text-ink">{admitted}</p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem("code") as HTMLInputElement;
          last.current = { code: "", at: 0 };
          busy.current = false;
          check(input.value.trim());
          input.value = "";
        }}
      >
        <label className="sr-only" htmlFor="code">
          Código del boleto
        </label>
        <input
          id="code"
          name="code"
          required
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="IV-XXXX-XXXX-XXXX"
          className={`${field.replace("mt-2 ", "")} font-mono uppercase tracking-[0.1em]`}
        />
        <button type="submit" className={btn}>
          Validar
        </button>
      </form>

      {history.length ? (
        <section aria-label="Últimos escaneos">
          <h2 className="label text-[10px] text-graphite">Últimos escaneos</h2>
          <ul className="mt-2 divide-y divide-rule border-y border-rule text-sm">
            {history.map((h, i) => (
              <li key={`${h.code}-${i}`} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">
                  <span className="font-mono text-xs">{h.code}</span>
                  {"label" in h ? <span className="ml-2 text-graphite">{h.label}</span> : null}
                </span>
                <span className={`label shrink-0 text-[10px] ${h.status === "ok" ? "text-ink" : "text-graphite line-through"}`}>
                  {headline[h.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
