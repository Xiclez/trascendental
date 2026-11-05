import { serviceFee } from "@/content/trascendental";

/**
 * Gross-up so that, after Stripe takes its fee (percent + fixed, both plus IVA) from the
 * total, the organizer keeps exactly `subtotal`:
 *   total − (total·p + f)·(1 + iva) = subtotal  ⇒  total = (subtotal + f·(1+iva)) / (1 − p·(1+iva))
 * Rounded UP to whole pesos so the net never falls short. Shared by the cart (display) and
 * /api/checkout (charge), so both always show the same number. One fee per order: Stripe's
 * fixed part is charged once per payment.
 */
export function feeFor(subtotal: number) {
  if (subtotal <= 0) return 0;
  const { percent, fixed, tax } = serviceFee;
  const total = (subtotal + fixed * (1 + tax)) / (1 - percent * (1 + tax));
  return Math.ceil(total - subtotal);
}

export const withFee = (subtotal: number) => {
  const fee = feeFor(subtotal);
  return { subtotal, fee, total: subtotal + fee };
};
