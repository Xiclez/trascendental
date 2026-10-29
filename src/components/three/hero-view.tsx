"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import { fragmentShader, vertexShader } from "./field-shader";
import { bindPointer, markReady, pointer } from "./pointer";

/**
 * Uniforms live at module scope (EPK pattern): there is exactly one hero field,
 * and they are mutated every frame — keeping them out of React avoids re-renders.
 */
const uniforms = {
  uTime: { value: 12 },
  uAspect: { value: 1 },
  uPointer: { value: new THREE.Vector2() },
  // Raw sRGB triplets: ShaderMaterial output is not colour-managed, so these
  // must match the CSS tokens byte-for-byte (paper #ebeae6, smoke #7d7b77).
  uPaper: { value: new THREE.Vector3(235 / 255, 234 / 255, 230 / 255) },
  uSmoke: { value: new THREE.Vector3(125 / 255, 123 / 255, 119 / 255) },
};

function Field() {
  const reduced = useReducedMotion();
  const size = useThree((s) => s.size);
  const frames = useRef(0);
  useEffect(bindPointer, []);
  useEffect(() => {
    uniforms.uAspect.value = size.width / Math.max(1, size.height);
  }, [size.width, size.height]);

  useFrame((_, delta) => {
    if (!reduced) {
      uniforms.uTime.value += delta;
      const k = Math.min(1, delta * 2);
      uniforms.uPointer.value.x += (pointer.x - uniforms.uPointer.value.x) * k;
      uniforms.uPointer.value.y += (pointer.y - uniforms.uPointer.value.y) * k;
    }
    if (++frames.current === 2) markReady("hero");
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function HeroView({ className }: { className?: string }) {
  return (
    <View className={className}>
      <Field />
    </View>
  );
}
