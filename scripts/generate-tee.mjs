/**
 * Generates the placeholder t-shirt model → public/models/tee.glb
 *
 * No third-party asset: the shirt is a signed-distance sculpt (torso, sleeves,
 * neck scoop + rib, subtle drape folds) meshed with Surface Nets, then
 * simplified, quantised and meshopt-compressed with glTF-Transform.
 * Replace the output with a real garment scan when one exists and point
 * `merch.showcase.model` (src/content/trascendental.ts) to it.
 *
 *   npm run gen:tee
 */
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, simplify, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { mkdirSync } from "node:fs";

// ---------- SDF helpers ----------------------------------------------------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smin = (a, b, k) => {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b * (1 - h) + a * h - k * h * (1 - h);
};
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const ellipse = (x, z, a, b) => (Math.hypot(x / a, z / b) - 1) * Math.min(a, b);

function capsule(px, py, pz, ax, ay, bx, by, r0, r1) {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby;
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / len2, 0, 1);
  const cx = ax + abx * t, cy = ay + aby * t;
  const r = r0 + (r1 - r0) * t;
  return Math.hypot(px - cx, py - cy, pz / 0.78) * 0.78 - r * 0.78;
}

function sleeve(x, y, z) {
  const ax = 0.27, ay = 0.34, bx = 0.6, by = 0.08;
  const X = Math.abs(x);
  let d = capsule(X, y, z, ax, ay, bx, by, 0.135, 0.11);
  // flat cuff, perpendicular to the sleeve axis
  const ux = bx - ax, uy = by - ay, ul = Math.hypot(ux, uy);
  const nx = ux / ul, ny = uy / ul;
  d = Math.max(d, (X - bx) * nx + (y - by) * ny);
  return d;
}

function torso(x, y, z) {
  const flare = smoothstep(0.1, -0.62, y) * 0.025;
  const rx = 0.375 + flare;
  const rz = 0.12 + smoothstep(-0.3, 0.2, y) * 0.02;
  const dxz = ellipse(x, z, rx, rz);
  const top = 0.43 - 0.13 * Math.pow(Math.min(1, Math.abs(x) / 0.4), 2);
  const dy = Math.max(-0.62 - y, y - top);
  const ox = Math.max(dxz, 0), oy = Math.max(dy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(dxz, dy), 0) - 0.02;
}

function sdf(x, y, z) {
  let d = smin(torso(x, y, z), sleeve(x, y, z), 0.07);
  // neck scoop (front lower than back)
  const ny = 0.47 - 0.35 * Math.max(z, 0);
  const scoop = Math.hypot(x / 0.135, (y - ny) / 0.12, (z - 0.015) / 0.105) - 1;
  d = Math.max(d, -scoop * 0.1);
  // rib collar
  const ringY = 0.405 - 0.32 * Math.max(z, 0);
  const ring = Math.hypot(ellipse(x, z - 0.015, 0.14, 0.11), y - ringY) - 0.016;
  d = smin(d, ring, 0.015);
  // drape folds: strongest at the hem, absent on the chest print area
  const hem = smoothstep(-0.05, -0.6, y);
  const side = smoothstep(0.12, 0.34, Math.abs(x));
  d += 0.0045 * hem * Math.sin(x * 26 + Math.sin(y * 5) * 1.4);
  d += 0.003 * side * Math.sin(y * 18 + x * 9);
  return d;
}

// ---------- Surface Nets ---------------------------------------------------
const STEP = 0.0105;
const MIN = [-0.82, -0.7, -0.26];
const MAX = [0.82, 0.62, 0.26];
const N = MIN.map((m, i) => Math.ceil((MAX[i] - m) / STEP) + 1);
const [NX, NY, NZ] = N;
const idx = (i, j, k) => i + NX * (j + NY * k);
const field = new Float32Array(NX * NY * NZ);
for (let k = 0; k < NZ; k++)
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++)
      field[idx(i, j, k)] = sdf(MIN[0] + i * STEP, MIN[1] + j * STEP, MIN[2] + k * STEP);

const cellVert = new Int32Array(NX * NY * NZ).fill(-1);
const positions = [];
const CORNERS = [];
for (let c = 0; c < 8; c++) CORNERS.push([c & 1, (c >> 1) & 1, (c >> 2) & 1]);
const EDGES = [];
for (let a = 0; a < 8; a++)
  for (let b = a + 1; b < 8; b++) {
    const da = CORNERS[a], db = CORNERS[b];
    if (Math.abs(da[0] - db[0]) + Math.abs(da[1] - db[1]) + Math.abs(da[2] - db[2]) === 1) EDGES.push([a, b]);
  }

for (let k = 0; k < NZ - 1; k++)
  for (let j = 0; j < NY - 1; j++)
    for (let i = 0; i < NX - 1; i++) {
      const v = CORNERS.map(([a, b, c]) => field[idx(i + a, j + b, k + c)]);
      let mask = 0;
      v.forEach((val, n) => (mask |= (val < 0 ? 1 : 0) << n));
      if (mask === 0 || mask === 255) continue;
      let sx = 0, sy = 0, sz = 0, cnt = 0;
      for (const [a, b] of EDGES) {
        if (v[a] < 0 === v[b] < 0) continue;
        const t = v[a] / (v[a] - v[b]);
        const A = CORNERS[a], B = CORNERS[b];
        sx += A[0] + (B[0] - A[0]) * t;
        sy += A[1] + (B[1] - A[1]) * t;
        sz += A[2] + (B[2] - A[2]) * t;
        cnt++;
      }
      cellVert[idx(i, j, k)] = positions.length / 3;
      positions.push(MIN[0] + (i + sx / cnt) * STEP, MIN[1] + (j + sy / cnt) * STEP, MIN[2] + (k + sz / cnt) * STEP);
    }

const indices = [];
const quad = (a, b, c, d, flip) => {
  if ([a, b, c, d].some((q) => q < 0)) return;
  if (flip) indices.push(a, c, b, a, d, c);
  else indices.push(a, b, c, a, c, d);
};
for (let k = 1; k < NZ - 1; k++)
  for (let j = 1; j < NY - 1; j++)
    for (let i = 1; i < NX - 1; i++) {
      const inside = field[idx(i, j, k)] < 0;
      // x-edge → cells around it in the yz plane
      if (inside !== field[idx(i + 1, j, k)] < 0)
        quad(cellVert[idx(i, j - 1, k - 1)], cellVert[idx(i, j, k - 1)], cellVert[idx(i, j, k)], cellVert[idx(i, j - 1, k)], !inside);
      if (inside !== field[idx(i, j + 1, k)] < 0)
        quad(cellVert[idx(i - 1, j, k - 1)], cellVert[idx(i - 1, j, k)], cellVert[idx(i, j, k)], cellVert[idx(i, j, k - 1)], !inside);
      if (inside !== field[idx(i, j, k + 1)] < 0)
        quad(cellVert[idx(i - 1, j - 1, k)], cellVert[idx(i, j - 1, k)], cellVert[idx(i, j, k)], cellVert[idx(i - 1, j, k)], !inside);
    }

// Smooth normals from the SDF gradient; fix any triangle wound against it.
const normals = new Float32Array(positions.length);
const e = 0.002;
for (let v = 0; v < positions.length; v += 3) {
  const [x, y, z] = [positions[v], positions[v + 1], positions[v + 2]];
  const gx = sdf(x + e, y, z) - sdf(x - e, y, z);
  const gy = sdf(x, y + e, z) - sdf(x, y - e, z);
  const gz = sdf(x, y, z + e) - sdf(x, y, z - e);
  const l = Math.hypot(gx, gy, gz) || 1;
  normals[v] = gx / l; normals[v + 1] = gy / l; normals[v + 2] = gz / l;
}
for (let t = 0; t < indices.length; t += 3) {
  const [a, b, c] = [indices[t] * 3, indices[t + 1] * 3, indices[t + 2] * 3];
  const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2];
  const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
  const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
  if (fx * normals[a] + fy * normals[a + 1] + fz * normals[a + 2] < 0) {
    const tmp = indices[t + 1]; indices[t + 1] = indices[t + 2]; indices[t + 2] = tmp;
  }
}

const uvs = new Float32Array((positions.length / 3) * 2);
for (let v = 0, u = 0; v < positions.length; v += 3, u += 2) {
  uvs[u] = (positions[v] - MIN[0]) / (MAX[0] - MIN[0]);
  uvs[u + 1] = (positions[v + 1] - MIN[1]) / (MAX[1] - MIN[1]);
}

// ---------- glTF ------------------------------------------------------------
const doc = new Document();
const buffer = doc.createBuffer();
const prim = doc
  .createPrimitive()
  .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(positions)).setBuffer(buffer))
  .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(normals).setBuffer(buffer))
  .setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(uvs).setBuffer(buffer))
  .setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(indices)).setBuffer(buffer))
  .setMaterial(doc.createMaterial("Fabric").setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.92).setMetallicFactor(0));
const mesh = doc.createMesh("Tee").addPrimitive(prim);
doc.createScene("Scene").addChild(doc.createNode("Tee").setMesh(mesh));

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.35, error: 0.001 }),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);

mkdirSync("public/models", { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
await io.write("public/models/tee.glb", doc);
console.log(`tee.glb · ${positions.length / 3} verts → simplified · ${indices.length / 3} tris before simplify`);
