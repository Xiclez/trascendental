"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { TeePrint } from "@/content/trascendental";

const SceneCanvas = dynamic(() => import("./scene-canvas"), { ssr: false });
const HeroView = dynamic(() => import("./hero-view"), { ssr: false });
const TeeView = dynamic(() => import("./tee-view"), { ssr: false });

let webglCache: boolean | null = null;
function probeWebGL() {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement("canvas");
    webglCache = Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    webglCache = false;
  }
  return webglCache;
}

/** true on the client when WebGL exists; always false during SSR. */
export function useWebGL() {
  return useSyncExternalStore(
    () => () => {},
    probeWebGL,
    () => false,
  );
}

/** Mounts the shared canvas after first paint + idle, so it never blocks LCP. */
export function GLRoot() {
  const webgl = useWebGL();
  const [go, setGo] = useState(false);

  useEffect(() => {
    if (!webgl) return;
    const start = () => setGo(true);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(start, { timeout: 2500 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(start, 1200);
    return () => window.clearTimeout(id);
  }, [webgl]);

  return go ? <SceneCanvas /> : null;
}

/** Hero region. Renders nothing without WebGL (the CSS fallback stays). */
export function HeroGL({ className }: { className?: string }) {
  const webgl = useWebGL();
  return webgl ? <HeroView className={className} /> : null;
}

type TeeDesign = { front: TeePrint; back: TeePrint };
type TeeGLProps = {
  className?: string;
  fabric: string;
  model: string;
  design: TeeDesign;
  designs: TeeDesign[];
};

/** Tee region. Only fetches three/drei + the GLB when the section approaches the viewport. */
export function TeeGL({ className, ...props }: TeeGLProps) {
  const webgl = useWebGL();
  const sentinel = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || near) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "600px 0px" });
    io.observe(node);
    return () => io.disconnect();
  }, [near, webgl]);

  if (!webgl) return null;
  return near ? <TeeView className={className} {...props} /> : <div ref={sentinel} className={className} />;
}
