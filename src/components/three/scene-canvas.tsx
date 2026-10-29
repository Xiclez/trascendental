"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";

/**
 * THE ONLY WebGL CANVAS ON THE PAGE.
 * Fixed behind the content; every 3D region (hero field, tee showcase) is a
 * drei <View> that scissors into this one context. Loaded with
 * next/dynamic(ssr:false) from gl-root.tsx.
 */
export default function SceneCanvas() {
  const [mobile] = useState(
    () => window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768,
  );
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <Canvas
      aria-hidden
      eventSource={document.body}
      eventPrefix="client"
      dpr={mobile ? [1, 1.5] : [1, 2]}
      frameloop={hidden ? "never" : "always"}
      gl={{ antialias: !mobile, alpha: true, powerPreference: mobile ? "low-power" : "high-performance" }}
      shadows={false}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}
    >
      <View.Port />
    </Canvas>
  );
}
