/**
 * Viewport-normalised pointer (-1..1) shared by every View. A View only gets
 * R3F pointer updates while the cursor is over it; the tilt and shader
 * parallax should react to the cursor anywhere on screen.
 */
export const pointer = { x: 0, y: 0 };

let bound = false;
export function bindPointer() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    },
    { passive: true },
  );
}

export function markReady(region: "hero" | "tee") {
  document.documentElement.dataset[region === "hero" ? "glHero" : "glTee"] = "ready";
}
