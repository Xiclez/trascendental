"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { Maximize, Volume2, VolumeX } from "lucide-react";
import { SnapControls, trackClass, useSnapTrack } from "@/components/snap-track";
import type { GalleryItem } from "@/content/trascendental";
import { rise } from "@/lib/motion";

/**
 * Past-edition gallery. Native scroll-snap track (touch/trackpad friendly) + prev/next buttons.
 * Videos start as muted loops that only play while their slide is mostly visible (browsers
 * only autoplay muted); each has its own sound toggle and a full-screen button, where native
 * controls take over. Under reduced motion they never autoplay and expose native controls.
 * Not a signature effect: no autoplay advance, no custom transitions.
 */

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

const videoBtn =
  "pointer-events-auto inline-flex size-11 items-center justify-center border border-paper/40 bg-ink/60 text-paper backdrop-blur-sm transition-colors hover:bg-ink";

function Slide({ item, index, total, visible }: { item: GalleryItem; index: number; total: number; visible: boolean }) {
  const reduced = useReducedMotion();
  const video = useRef<FullscreenVideo>(null);
  const [muted, setMuted] = useState(true);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v || reduced || full) return;
    if (visible) v.play().catch(() => {});
    else v.pause();
  }, [visible, reduced, full]);

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === video.current && video.current != null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleSound = () => {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) v.play().catch(() => {});
  };

  const openFullscreen = () => {
    const v = video.current;
    if (!v) return;
    if (v.requestFullscreen) v.requestFullscreen().catch(() => {});
    else v.webkitEnterFullscreen?.(); // iOS Safari: native player
    v.play().catch(() => {});
  };

  return (
    <li
      data-index={index}
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} de ${total}`}
      className="group relative aspect-video w-[86%] shrink-0 snap-start overflow-hidden border border-rule bg-ink sm:w-[64%] lg:w-[46%]"
    >
      {item.type === "image" ? (
        <Image
          src={item.src}
          alt={item.alt}
          fill
          sizes="(min-width: 1024px) 46vw, (min-width: 640px) 64vw, 86vw"
          className="object-cover"
        />
      ) : (
        <video
          ref={video}
          src={item.src}
          poster={item.poster}
          aria-label={item.alt}
          muted
          loop
          playsInline
          preload="none"
          controls={Boolean(reduced) || full}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          className="absolute inset-0 size-full object-cover [&:fullscreen]:object-contain"
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-ink/70 to-transparent p-4 pt-10">
        <span className="numeral text-2xl leading-none text-paper">{item.edition ?? ""}</span>
        {item.type === "video" ? (
          <span className="flex gap-2">
            <button type="button" onClick={toggleSound} aria-pressed={!muted} aria-label={muted ? "Activar sonido" : "Silenciar"} className={videoBtn}>
              {muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
            </button>
            <button type="button" onClick={openFullscreen} aria-label="Ver en pantalla completa" className={videoBtn}>
              <Maximize className="size-4" aria-hidden />
            </button>
          </span>
        ) : (
          <span className="label text-[10px] text-paper/80">Foto</span>
        )}
      </div>
    </li>
  );
}

export function GalleryCarousel({ items, label }: { items: GalleryItem[]; label: string }) {
  const { track, visible, active, go, onKeyDown } = useSnapTrack(items.length);

  if (!items.length) return null;

  return (
    <motion.div variants={rise} role="region" aria-roledescription="carousel" aria-label={label}>
      <ul ref={track} tabIndex={0} onKeyDown={onKeyDown} className={trackClass}>
        {items.map((item, i) => (
          <Slide key={item.src} item={item} index={i} total={items.length} visible={visible.has(i)} />
        ))}
      </ul>
      <SnapControls active={active} visible={visible} go={go} count={items.length} />
    </motion.div>
  );
}
