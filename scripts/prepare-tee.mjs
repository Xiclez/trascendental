/**
 * Prepares the real t-shirt model → public/models/tee.glb
 *
 * Source: References/tshirt.glb — "Tshirt" by Tabbuso (Sketchfab), CC-BY-4.0:
 * https://sketchfab.com/3d-models/tshirt-5a21282b2e454d1696547148f617d3d0 (credited in the merch section).
 *
 * The Sketchfab export is 4 chunks (65k-vertex split) under a stack of axis-swap nodes.
 * This bakes every node transform, joins the chunks into ONE mesh named "Tee",
 * normalises it (front = +z, upright, centred, HEIGHT units tall), drops the unused UVs,
 * then welds, simplifies and meshopt-compresses it. Print placements in
 * src/content/trascendental.ts are in these normalised units.
 *
 *   npm run gen:tee
 */
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, simplify, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { mkdirSync } from "node:fs";

const SRC = "References/tshirt.glb";
const OUT = "public/models/tee.glb";
const HEIGHT = 1.8; // collar → hem, in scene units (the camera frames ~2.7 units)
const TARGET_TRIS = 44_000;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const src = await io.read(SRC);

// ---------- bake + join ------------------------------------------------------
const positions = [];
const normals = [];
const indices = [];
for (const node of src.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const m = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute("POSITION");
    const nrm = prim.getAttribute("NORMAL");
    const idx = prim.getIndices();
    const base = positions.length / 3;
    const v = [0, 0, 0];
    for (let i = 0; i < pos.getCount(); i++) {
      pos.getElement(i, v);
      positions.push(
        m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
        m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
        m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
      );
      nrm.getElement(i, v);
      // The world matrix is rotation × uniform scale: the upper 3×3, renormalised, maps normals.
      const nx = m[0] * v[0] + m[4] * v[1] + m[8] * v[2];
      const ny = m[1] * v[0] + m[5] * v[1] + m[9] * v[2];
      const nz = m[2] * v[0] + m[6] * v[1] + m[10] * v[2];
      const l = Math.hypot(nx, ny, nz) || 1;
      normals.push(nx / l, ny / l, nz / l);
    }
    for (let i = 0; i < idx.getCount(); i++) indices.push(base + idx.getScalar(i));
  }
}

// ---------- normalise --------------------------------------------------------
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < positions.length; i += 3)
  for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], positions[i + k]);
    max[k] = Math.max(max[k], positions[i + k]);
  }
const centre = [0, 1, 2].map((k) => (min[k] + max[k]) / 2);
const scale = HEIGHT / (max[1] - min[1]);
for (let i = 0; i < positions.length; i += 3)
  for (let k = 0; k < 3; k++) positions[i + k] = (positions[i + k] - centre[k]) * scale;

// ---------- glTF -------------------------------------------------------------
const doc = new Document();
doc.getRoot().getAsset().extras = src.getRoot().getAsset().extras; // keeps author + licence
const buffer = doc.createBuffer();
const prim = doc
  .createPrimitive()
  .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(positions)).setBuffer(buffer))
  .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(normals)).setBuffer(buffer))
  .setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(indices)).setBuffer(buffer))
  .setMaterial(doc.createMaterial("Fabric").setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.92).setMetallicFactor(0).setDoubleSided(true));
const mesh = doc.createMesh("Tee").addPrimitive(prim);
doc.createScene("Scene").addChild(doc.createNode("Tee").setMesh(mesh));

const trisIn = indices.length / 3;
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: TARGET_TRIS / trisIn, error: 0.002 }),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);

mkdirSync("public/models", { recursive: true });
await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder }).write(OUT, doc);
const out = doc.getRoot().listMeshes()[0].listPrimitives()[0];
console.log(
  `${OUT} · ${trisIn} → ${out.getIndices().getCount() / 3} tris · ` +
    `x ±${(((max[0] - min[0]) / 2) * scale).toFixed(3)} y ±${(HEIGHT / 2).toFixed(3)} z ±${(((max[2] - min[2]) / 2) * scale).toFixed(3)}`,
);
