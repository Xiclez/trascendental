"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Decal,
  Environment,
  Edges,
  Lightformer,
  Line,
  PerspectiveCamera,
  View,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { TeePrint } from "@/content/trascendental";
import { bindPointer, markReady, pointer } from "./pointer";

/** Front + back artwork of one design/colour (see `ProductModel.prints` in content). */
export type TeeDesign = { front: TeePrint; back: TeePrint };

type Props = {
  className?: string;
  fabric: string;
  model: string;
  /** What the shirt shows now. Changes play the spin choreography, swapping at the apex. */
  design: TeeDesign;
  /** Every design the user can pick, preloaded so the swap never waits on the network. */
  designs: TeeDesign[];
};

const DECAL_DEPTH = 0.3; // projection box depth; the torso surface is at z ≈ ±0.23
const sameDesign = (a: TeeDesign, b: TeeDesign) => a.front.src === b.front.src && a.back.src === b.back.src;

const TURNTABLE_SPEED = 0.32; // rad/s — DRIFT
const DRAG_SPEED = 0.0105; // rad per CSS px
const RESUME_TIME = 0.9; // s for the autospin to fade back in after release
const SWAP_DURATION = 1.15; // s, whole colour choreography
const APEX = 0.38; // fraction of the choreography spent on the fast spin-up

const easeInCubic = (t: number) => t * t * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/**
 * Free drag state. Pointer handlers write here; useFrame reads it.
 * No angle limits and no snap-back: wherever the user leaves the shirt,
 * the turntable continues from there.
 */
type Drag = {
  active: boolean;
  id: number;
  lastX: number;
  lastY: number;
  lastT: number;
  dx: number; // accumulated since last frame
  dy: number;
  velY: number; // rad/s, for release inertia
  velX: number;
  released: number; // seconds since release
};

function Tee({ fabric, model, design, designs, track }: Omit<Props, "className"> & { track: HTMLElement }) {
  const reduced = useReducedMotion();
  const gltf = useGLTF(model);
  const geometry = (gltf.nodes.Tee as THREE.Mesh).geometry;
  const urls = useMemo(() => [...new Set(designs.flatMap((d) => [d.front.src, d.back.src]))], [designs]);
  const textures = useTexture(urls, (loaded) => {
    for (const t of Array.isArray(loaded) ? loaded : [loaded]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    }
  });
  const tex = (src: string) => textures[urls.indexOf(src)];
  const drag = useRef<Drag>({ active: false, id: -1, lastX: 0, lastY: 0, lastT: 0, dx: 0, dy: 0, velY: 0, velX: 0, released: 99 });

  // Free drag: pointer handlers on the View's DOM element write into `drag`; useFrame reads it.
  useEffect(() => {
    const d = drag.current;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      d.active = true;
      d.id = e.pointerId;
      d.lastX = e.clientX;
      d.lastY = e.clientY;
      d.lastT = performance.now();
      d.velX = d.velY = 0;
      track.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!d.active || e.pointerId !== d.id) return;
      const now = performance.now();
      const mx = e.clientX - d.lastX;
      const my = e.clientY - d.lastY;
      const dt = Math.max(1, now - d.lastT) / 1000;
      d.dx += mx;
      d.dy += my;
      d.velY = THREE.MathUtils.lerp(d.velY, (mx * DRAG_SPEED) / dt, 0.5);
      d.velX = THREE.MathUtils.lerp(d.velX, (my * DRAG_SPEED) / dt, 0.5);
      d.lastX = e.clientX;
      d.lastY = e.clientY;
      d.lastT = now;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== d.id) return;
      d.active = false;
      d.released = 0;
      // A pause before letting go means no fling.
      if (performance.now() - d.lastT > 80) d.velX = d.velY = 0;
    };
    track.addEventListener("pointerdown", down);
    track.addEventListener("pointermove", move);
    track.addEventListener("pointerup", up);
    track.addEventListener("pointercancel", up);
    return () => {
      track.removeEventListener("pointerdown", down);
      track.removeEventListener("pointermove", move);
      track.removeEventListener("pointerup", up);
      track.removeEventListener("pointercancel", up);
    };
  }, [track]);


  // What the mesh shows. Prop changes don't land here directly (that would swap instantly):
  // they go through the choreography below, which commits them at the apex of the spin.
  const [shown, setShown] = useState(() => ({ fabric, design }));
  const spinY = useRef<THREE.Group>(null); // turntable + horizontal drag
  const spinX = useRef<THREE.Group>(null); // vertical drag
  const tilt = useRef<THREE.Group>(null); // cursor lean
  const angleY = useRef(-0.35);
  const angleX = useRef(0);
  const swap = useRef<{ t: number; swapped: boolean; fabric: string; design: TeeDesign } | null>(null);

  useEffect(bindPointer, []);
  // Suspense has resolved (GLB + print loaded): hand off from the static fallback
  // after the first painted frames.
  useEffect(() => {
    let id = requestAnimationFrame(() => (id = requestAnimationFrame(() => markReady("tee"))));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (reduced) return; // no choreography: `current` below follows the props directly
    const target = swap.current ?? shown;
    if (target.fabric === fabric && sameDesign(target.design, design)) return;
    swap.current = { t: 0, swapped: false, fabric, design };
  }, [fabric, design, reduced, shown]);
  const current = reduced ? { fabric, design } : shown;

  useFrame((_, dtRaw) => {
    const gy = spinY.current;
    const gx = spinX.current;
    const tg = tilt.current;
    if (!gy || !gx || !tg) return;
    const dt = Math.min(dtRaw, 1 / 20);
    const d = drag.current;

    if (d.active) {
      // 1:1 with the pointer, both axes, unlimited.
      angleY.current += d.dx * DRAG_SPEED;
      angleX.current += d.dy * DRAG_SPEED;
    } else {
      d.released += dt;
      // Release inertia, then the turntable fades back in.
      const decay = Math.pow(0.04, dt);
      d.velY *= decay;
      d.velX *= decay;
      angleY.current += d.velY * dt;
      angleX.current += d.velX * dt;
      if (!reduced) {
        const resume = THREE.MathUtils.smoothstep(d.released, 0.15, 0.15 + RESUME_TIME);
        angleY.current += dt * TURNTABLE_SPEED * resume;
        // Upright again so the spin reads as a turntable, along the shortest path.
        const k = resume * Math.min(1, dt * 1.6);
        const target = Math.round(angleX.current / (Math.PI * 2)) * Math.PI * 2;
        angleX.current += (target - angleX.current) * k;
      }
    }
    d.dx = d.dy = 0;

    let extra = 0;
    let lift = 0;
    const s = swap.current;
    if (s) {
      s.t = Math.min(1, s.t + dt / SWAP_DURATION);
      if (s.t < APEX) {
        // 1. fast spin up to the apex (half a turn) with a small lift
        const k = s.t / APEX;
        extra = Math.PI * easeInCubic(k);
        lift = 0.07 * easeOutCubic(k);
      } else {
        // 2. fabric + artwork swap at the apex — the shirt is edge-on / back-facing
        if (!s.swapped) {
          s.swapped = true;
          setShown({ fabric: s.fabric, design: s.design });
        }
        // 3. settle the second half-turn with back easing (slight overshoot)
        const k = (s.t - APEX) / (1 - APEX);
        const b = easeOutBack(k);
        extra = Math.PI + Math.PI * b;
        lift = 0.07 * (1 - b);
      }
      if (s.t >= 1) {
        swap.current = null;
        extra = 0;
        angleY.current += Math.PI * 2;
      }
    }

    gy.rotation.y = angleY.current + extra;
    gx.rotation.x = angleX.current;
    gx.position.y = lift;

    // Gentle lean toward the cursor (desktop only; off while dragging).
    const k = Math.min(1, dt * 3);
    const lean = !reduced && !d.active;
    tg.rotation.x += ((lean ? -pointer.y * 0.08 : 0) - tg.rotation.x) * k;
    tg.rotation.y += ((lean ? pointer.x * 0.14 : 0) - tg.rotation.y) * k;
  });

  return (
    <group ref={tilt}>
      <group ref={spinX}>
        <group ref={spinY}>
          <mesh geometry={geometry}>
            <meshPhysicalMaterial
              color={current.fabric}
              roughness={0.9}
              sheen={0.5}
              sheenRoughness={0.8}
              sheenColor={current.fabric}
            />
            {/* The real artwork, projected front and back so it follows the fabric curvature.
                Keyed by image so the decal geometry is rebuilt with the new placement. */}
            {(["front", "back"] as const).map((side) => {
              const p = current.design[side];
              const back = side === "back";
              return (
                <Decal
                  key={`${side}-${p.src}`}
                  // Seen from behind (rotated π), +x flips: mirror x so the print stays centred where measured.
                  position={[back ? -p.position[0] : p.position[0], p.position[1], back ? -0.12 : 0.12]}
                  rotation={[0, back ? Math.PI : 0, 0]}
                  scale={[p.scale[0], p.scale[1], DECAL_DEPTH]}
                >
                  <meshStandardMaterial
                    map={tex(p.src)}
                    transparent
                    roughness={0.75}
                    polygonOffset
                    polygonOffsetFactor={-4}
                    depthWrite={false}
                  />
                </Decal>
              );
            })}
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * The flyer's stage behind the shirt: the orb linework and the receding mirror
 * panels. Lives in 3D (not HTML) because the shared canvas sits beneath the DOM.
 */
function FlyerStage() {
  const rings = useMemo(() => {
    const circle = (rx: number, ry: number, cy = 0) =>
      Array.from({ length: 97 }, (_, i) => {
        const a = (i / 96) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry + cy, 0);
      });
    const R = 1.12;
    return [
      circle(R, R),
      circle(R * 0.88, R * 0.88, -0.07),
      circle(R * 0.74, R * 0.74, -0.14),
      ...[0.2, 0.45, 0.68, 0.86].map((k) => circle(R * k, R)),
      circle(R, R * 0.24),
    ];
  }, []);
  const panels = [0, 1, 2, 3].flatMap((i) =>
    [-1, 1].map((s) => ({
      key: `${s}-${i}`,
      position: [s * (0.62 + i * 0.27), 0.02, -0.35 - i * 0.22] as [number, number, number],
      rotation: [0, -s * 0.42, 0] as [number, number, number],
      size: [0.24, 1.55 - i * 0.24] as [number, number],
      opacity: 0.85 - i * 0.16,
    })),
  );
  return (
    <group>
      <group position={[0, 0.06, -1.6]}>
        {rings.map((pts, i) => (
          <Line key={i} points={pts} color="#a8a59e" lineWidth={1} transparent opacity={i < 3 ? 0.9 : 0.6} />
        ))}
      </group>
      {panels.map((p) => (
        <mesh key={p.key} position={p.position} rotation={p.rotation}>
          <planeGeometry args={p.size} />
          <meshBasicMaterial color="#f6f5f1" transparent opacity={p.opacity} toneMapped={false} />
          <Edges color="#b4b1aa" />
        </mesh>
      ))}
    </group>
  );
}

function Rig({ track, mobile, tee }: { track: HTMLElement; mobile: boolean; tee: Omit<Props, "className"> }) {
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  const z = aspect < 1 ? (4.7 / Math.max(0.6, aspect)) * 0.9 : 4.7;
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.02, z]} fov={32} />
      {/* Soft studio light: white cotton on white paper needs shape from shading, not contrast */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[2.5, 3.5, 3]} intensity={1.15} />
      <directionalLight position={[-3, 1, -2]} intensity={0.35} />
      <Environment resolution={mobile ? 128 : 256} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 3, 2.5]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={0.9} position={[-4, 0.5, 1]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={0.5} position={[4, 0, -1]} rotation-y={-Math.PI / 2} scale={[3, 3, 1]} />
      </Environment>
      <ContactShadows
        position={[0, -0.74, 0]}
        opacity={0.42}
        scale={3}
        blur={2.8}
        far={1.4}
        resolution={mobile ? 256 : 512}
        frames={mobile ? 1 : Infinity}
        color="#2a2926"
      />
      <FlyerStage />
      <Suspense fallback={null}>
        <Tee {...tee} track={track} />
      </Suspense>
    </>
  );
}

export default function TeeView({ className, ...tee }: Props) {
  const [track, setTrack] = useState<HTMLElement | null>(null);
  const ref = useCallback((node: HTMLElement | null) => setTrack(node), []);
  const [mobile] = useState(
    () => window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768,
  );

  return (
    <View
      ref={ref}
      className={`${className ?? ""} active:!cursor-grabbing`}
      // pan-y: on touch, vertical swipes keep scrolling the page; horizontal swipes spin the shirt.
      style={{ touchAction: "pan-y", cursor: "grab" }}
    >
      {track ? <Rig track={track} mobile={mobile} tee={tee} /> : null}
    </View>
  );
}
