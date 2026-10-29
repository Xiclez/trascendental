"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { products, tickets } from "@/content/trascendental";

/**
 * Client-side cart. Lines only carry ids + variant; names and prices are always
 * re-read from content (and re-validated server-side in /api/checkout).
 */
export type CartLine = {
  key: string;
  kind: "ticket" | "product";
  id: string;
  quantity: number;
  color?: string;
  size?: string;
};

type CartState = {
  lines: CartLine[];
  count: number;
  total: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (line: Omit<CartLine, "key" | "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "trascendental-iv-cart";
export const MAX_PER_LINE = 10;

const CartContext = createContext<CartState | null>(null);

export function lineInfo(line: CartLine) {
  if (line.kind === "ticket") {
    const t = tickets.find((x) => x.id === line.id);
    return t ? { name: `${t.name} · ${t.phase}`, price: t.price, meta: "Ticket" } : null;
  }
  const p = products.find((x) => x.id === line.id);
  if (!p) return null;
  const color = p.colors?.find((c) => c.id === line.color)?.name;
  return { name: p.name, price: p.price, meta: [color, line.size].filter(Boolean).join(" · ") };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from storage
      if (raw) setLines((JSON.parse(raw) as CartLine[]).filter((l) => lineInfo(l)));
    } catch {
      /* storage unavailable — cart stays in memory */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, hydrated]);

  const add = useCallback<CartState["add"]>((line, quantity = 1) => {
    const key = [line.kind, line.id, line.color, line.size].filter(Boolean).join(":");
    setLines((prev) => {
      const found = prev.find((l) => l.key === key);
      if (found)
        return prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_PER_LINE, l.quantity + quantity) } : l));
      return [...prev, { ...line, key, quantity: Math.min(MAX_PER_LINE, quantity) }];
    });
    setOpen(true);
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_PER_LINE, quantity) } : l)),
    );
  }, []);

  const remove = useCallback((key: string) => setLines((prev) => prev.filter((l) => l.key !== key)), []);
  const clear = useCallback(() => {
    // Remove storage synchronously too: on /success this runs before the hydration effect.
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setLines([]);
  }, []);

  const value = useMemo<CartState>(() => {
    const count = lines.reduce((n, l) => n + l.quantity, 0);
    const total = lines.reduce((n, l) => n + (lineInfo(l)?.price ?? 0) * l.quantity, 0);
    return { lines, count, total, open, setOpen, add, setQuantity, remove, clear };
  }, [lines, open, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
