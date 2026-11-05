"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Move3d } from "lucide-react";
import { useCart } from "@/components/cart";
import { Orb, Portals } from "@/components/flyer";
import { Garment } from "@/components/garment";
import { TeeGL } from "@/components/three/gl-root";
import { Magnetic, Section } from "@/components/ui";
import { formatPrice, merchCopy, products, showcase, type MerchColor, type Product, type ProductModel } from "@/content/trascendental";
import { rise, stagger } from "@/lib/motion";

function ColorPicker({
  colors,
  value,
  onChange,
  name,
}: {
  colors: MerchColor[];
  value: string;
  onChange: (id: string) => void;
  name: string;
}) {
  return (
    <fieldset>
      <legend className="label mb-3 text-[10px] text-graphite">
        Color · <span className="text-ink">{colors.find((c) => c.id === value)?.name}</span>
      </legend>
      <div className="flex gap-2">
        {colors.map((c) => (
          <label key={c.id} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={c.id}
              checked={value === c.id}
              onChange={() => onChange(c.id)}
              className="peer sr-only"
            />
            <span className="sr-only">{c.name}</span>
            <span
              aria-hidden
              className="block size-11 border border-rule p-1 transition-colors peer-checked:border-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]"
            >
              <span className="block size-full" style={{ background: c.fabric }} />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SizePicker({
  sizes,
  value,
  onChange,
  name,
}: {
  sizes: string[];
  value: string;
  onChange: (s: string) => void;
  name: string;
}) {
  return (
    <fieldset>
      <legend className="label mb-3 text-[10px] text-graphite">Talla</legend>
      <div className="flex flex-wrap gap-2">
        {sizes.map((s) => (
          <label key={s} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={s}
              checked={value === s}
              onChange={() => onChange(s)}
              className="peer sr-only"
            />
            <span className="label inline-flex min-h-11 min-w-11 items-center justify-center border border-rule px-3 text-[11px] text-graphite transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">
              {s}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type View = "front" | "back" | "3d";

/** Segmented Frente / Espalda (/ 3D) switch — native radios, like colour and size. */
function ViewPicker({ views, value, onChange, name }: { views: View[]; value: View; onChange: (v: View) => void; name: string }) {
  const text = { front: merchCopy.front, back: merchCopy.back, "3d": merchCopy.view3d };
  return (
    <fieldset className="flex">
      <legend className="sr-only">Vista</legend>
      {views.map((v) => (
        <label key={v} className="cursor-pointer">
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="peer sr-only" />
          <span className="label -ml-px inline-flex min-h-11 items-center border border-rule bg-paper px-4 text-[10px] text-graphite transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">
            {text[v]}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** Design picker (Portales / Ascensión) — native radios with text, like the size picker. */
function ModelPicker({ models, value, onChange, name }: { models: ProductModel[]; value: string; onChange: (id: string) => void; name: string }) {
  const active = models.find((m) => m.id === value);
  return (
    <fieldset>
      <legend className="label mb-3 text-[10px] text-graphite">
        {merchCopy.model} · <span className="text-ink">{active?.name}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {models.map((m) => (
          <label key={m.id} className="cursor-pointer">
            <input type="radio" name={name} value={m.id} checked={value === m.id} onChange={() => onChange(m.id)} className="peer sr-only" />
            <span className="label inline-flex min-h-11 items-center justify-center border border-rule px-4 text-[11px] text-graphite transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">
              {m.name}
            </span>
          </label>
        ))}
      </div>
      {active ? <p className="mt-3 max-w-sm text-sm text-graphite">{active.blurb}</p> : null}
    </fieldset>
  );
}

/** Mockup photo of one design + colour + side. Both sides are rendered so switching is instant. */
function MockupPhoto({
  product,
  model,
  color,
  view,
  sizes,
}: {
  product: Product;
  model: ProductModel | undefined;
  color: string;
  view: "front" | "back";
  sizes: string;
}) {
  const set = model?.photos[color];
  if (!set || !model) return null;
  const colorName = product.colors?.find((c) => c.id === color)?.name ?? "";
  return (
    <>
      {(["front", "back"] as const).map((side) => (
        <Image
          key={`${model.id}-${color}-${side}`}
          src={set[side]}
          alt={`${product.name}, modelo ${model.name}, color ${colorName.toLowerCase()}, ${side === "front" ? "frente" : "espalda"}`}
          fill
          sizes={sizes}
          aria-hidden={side !== view}
          className={`object-cover ${side === view ? "" : "invisible"}`}
        />
      ))}
    </>
  );
}

function MockupNote({ className = "" }: { className?: string }) {
  return <p className={`text-[11px] leading-snug text-graphite ${className}`}>{merchCopy.mockupNote}</p>;
}

/** Signature #2 — the 3D tee showcase (one View inside the shared canvas). */
function Showcase({ product }: { product: Product }) {
  const { add } = useCart();
  const colors = product.colors ?? [];
  const sizes = product.sizes ?? [];
  const [color, setColor] = useState(colors[0]?.id ?? "");
  const [size, setSize] = useState(sizes[1] ?? sizes[0] ?? "");
  const active = colors.find((c) => c.id === color) ?? colors[0];
  const models = useMemo(() => product.models ?? [], [product.models]);
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const model = models.find((m) => m.id === modelId);
  const hasPhotos = Boolean(model?.photos[color]);
  const [view, setView] = useState<View>("3d");
  const design = model?.prints[color];
  // Every design × colour, preloaded by the 3D view so switching never waits on the network.
  const designs = useMemo(() => models.flatMap((m) => Object.values(m.prints)), [models]);

  return (
    <div id="showcase" className="grid items-center gap-10 lg:grid-cols-[1fr_minmax(0,1.35fr)_1fr]">
      <motion.div variants={rise} className="order-2 lg:order-1">
        <p className="label text-[11px] text-ink">Edición limitada</p>
        <h3 className="display mt-3 text-[clamp(2.4rem,5vw,3.8rem)] text-ink">{product.name}</h3>
        <p className="mt-4 max-w-sm text-graphite">{product.blurb}</p>
        <ul className="mt-8 space-y-3 text-sm text-ink/85">
          {product.details.map((d) => (
            <li key={d} className="flex gap-3">
              <span aria-hidden className="text-ink">+</span>
              {d}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div variants={rise} className="order-1 lg:order-2">
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[560px]">
          {/* Static stage (loading / no WebGL): orb + portals + the front mockup of the current pick. */}
          <div aria-hidden data-for="tee" className="gl-fallback absolute inset-0 text-rule">
            <Orb className="absolute left-1/2 top-[46%] w-[92%] -translate-x-1/2 -translate-y-1/2" />
            <Portals className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2" gap={150} />
            {hasPhotos ? (
              <div className="absolute inset-[12%] overflow-hidden bg-white">
                <MockupPhoto product={product} model={model} color={color} view="front" sizes="(min-width: 1024px) 420px, 76vw" />
              </div>
            ) : active ? (
              <Garment kind="tee" fabric={active.fabric} ink={active.ink} print={showcase.print} className="absolute inset-[14%] h-[72%] w-[72%]" />
            ) : null}
          </div>
          {active && design ? (
            <TeeGL className="absolute inset-0" fabric={active.fabric} model={showcase.model} design={design} designs={designs} />
          ) : null}
          {/* Photo views sit on top of the 3D View (the shared canvas is under the DOM), hiding it. */}
          {hasPhotos && view !== "3d" ? (
            <div className="absolute inset-0 overflow-hidden border border-rule bg-white">
              <MockupPhoto product={product} model={model} color={color} view={view} sizes="(min-width: 1024px) 560px, 100vw" />
            </div>
          ) : (
            <p className="label pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap text-[10px] text-graphite">
              <Move3d className="size-3.5" aria-hidden /> Arrastra para girar
            </p>
          )}
        </div>
        {hasPhotos ? (
          <div className="mx-auto mt-4 flex max-w-[560px] flex-col items-center gap-3">
            <ViewPicker views={["3d", "front", "back"]} value={view} onChange={setView} name="showcase-view" />
            {view !== "3d" ? <MockupNote className="text-center" /> : null}
          </div>
        ) : null}
      </motion.div>

      <motion.div variants={rise} className="order-3 space-y-8">
        <p className="display text-5xl tabular-nums">{formatPrice(product.price)}</p>
        {models.length ? <ModelPicker models={models} value={modelId} onChange={setModelId} name="showcase-model" /> : null}
        {colors.length ? <ColorPicker colors={colors} value={color} onChange={setColor} name="showcase-color" /> : null}
        {sizes.length ? <SizePicker sizes={sizes} value={size} onChange={setSize} name="showcase-size" /> : null}
        <Magnetic>
          <button
            type="button"
            onClick={() => add({ kind: "product", id: product.id, model: modelId || undefined, color, size })}
            className="label inline-flex min-h-12 items-center justify-center bg-ink px-10 text-[12px] text-paper transition-colors hover:bg-ink/80"
          >
            Agregar al carrito
          </button>
        </Magnetic>
      </motion.div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const colors = product.colors ?? [];
  const sizes = product.sizes ?? [];
  const [color, setColor] = useState(colors[0]?.id ?? "");
  const [size, setSize] = useState(sizes[0] ?? "");
  const active = colors.find((c) => c.id === color);
  const models = product.models ?? [];
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const model = models.find((m) => m.id === modelId);
  const hasPhotos = Boolean(model?.photos[color]);
  const [view, setView] = useState<"front" | "back">("front");

  return (
    <motion.article variants={rise} className="registered flex flex-col border border-rule bg-card/60" aria-labelledby={`p-${product.id}`}>
      <div className={`relative overflow-hidden border-b border-rule text-rule ${hasPhotos ? "aspect-[4/5] bg-white" : "aspect-square"}`}>
        {hasPhotos ? null : <Orb className="absolute left-1/2 top-1/2 w-[88%] -translate-x-1/2 -translate-y-1/2" />}
        {hasPhotos ? (
          <>
            <MockupPhoto product={product} model={model} color={color} view={view} sizes="(min-width: 768px) 50vw, 100vw" />
            <div className="absolute bottom-3 left-3">
              <ViewPicker views={["front", "back"]} value={view} onChange={(v) => setView(v as "front" | "back")} name={`${product.id}-view`} />
            </div>
          </>
        ) : product.kind === "print" && product.image ? (
          <Image
            src={product.image}
            alt={`${product.name} — arte del flyer`}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-contain p-8 mix-blend-multiply"
          />
        ) : active ? (
          <Garment
            kind={product.kind === "hoodie" ? "hoodie" : "tee"}
            fabric={active.fabric}
            ink={active.ink}
            print={showcase.print}
            className="absolute inset-[12%] h-[76%] w-[76%]"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h3 id={`p-${product.id}`} className="display text-3xl text-ink">
            {product.name}
          </h3>
          <span className="display text-2xl tabular-nums text-ink">{formatPrice(product.price)}</span>
        </div>
        <p className="-mt-3 text-sm text-graphite">{product.blurb}</p>
        {hasPhotos ? <MockupNote className="-mt-3" /> : null}
        {models.length > 1 ? (
          <ModelPicker models={models} value={modelId} onChange={setModelId} name={`${product.id}-model`} />
        ) : null}
        {colors.length > 1 ? (
          <ColorPicker colors={colors} value={color} onChange={setColor} name={`${product.id}-color`} />
        ) : null}
        {sizes.length > 1 ? (
          <SizePicker sizes={sizes} value={size} onChange={setSize} name={`${product.id}-size`} />
        ) : null}
        <button
          type="button"
          disabled={!product.available}
          onClick={() => add({ kind: "product", id: product.id, model: modelId || undefined, color: color || undefined, size: size || undefined })}
          className="label mt-auto inline-flex min-h-11 items-center justify-center bg-ink text-[11px] text-paper transition-colors hover:bg-ink disabled:opacity-40"
        >
          {product.available ? "Agregar" : "Próximamente"}
        </button>
      </div>
    </motion.article>
  );
}

export function Merch() {
  const hero = products.find((p) => p.id === showcase.productId);
  const rest = products.filter((p) => p.id !== showcase.productId);
  return (
    <Section id="merch" index="II" title="Merch oficial" kicker="Envío a todo México">
      {hero ? <Showcase product={hero} /> : null}
      <motion.div variants={stagger(0.1)} className="mt-24 grid gap-4 md:grid-cols-2">
        {rest.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </motion.div>
    </Section>
  );
}
