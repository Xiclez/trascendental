"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart";

/** Empties the cart once a checkout has completed (/success). */
export function ClearCart() {
  const { clear } = useCart();
  useEffect(() => clear(), [clear]);
  return null;
}
