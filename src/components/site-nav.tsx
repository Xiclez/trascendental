"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/components/cart";
import { event, nav } from "@/content/trascendental";

export function SiteNav() {
  const { count, setOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[70] transition-colors duration-300 ${
        scrolled || menuOpen ? "border-b border-rule bg-paper/85 backdrop-blur-md" : ""
      }`}
    >
      <a
        href="#tickets"
        className="label sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-ink focus:px-3 focus:py-2 focus:text-[11px] focus:text-paper"
      >
        Saltar a tickets
      </a>

      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-4 px-5 sm:px-8">
        <a href="#top" className="flex items-center gap-3" aria-label={`${event.title} ${event.edition} — inicio`}>
          <Image src="/brand/hc-mark.png" alt="" width={226} height={113} className="h-4 w-auto" priority />
          <span className="label hidden text-[11px] text-ink sm:inline">
            Trascendental <span className="numeral text-[13px] tracking-normal">{event.edition}</span>
          </span>
        </a>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="label text-[11px] text-graphite transition-colors hover:text-ink">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#tickets"
            className="label hidden min-h-11 items-center bg-ink px-5 text-[11px] text-paper transition-colors hover:bg-ink/80 md:inline-flex"
          >
            Comprar tickets
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative inline-flex size-11 items-center justify-center border border-rule text-ink transition-colors hover:border-ink"
            aria-label={`Abrir carrito (${count} ${count === 1 ? "artículo" : "artículos"})`}
          >
            <ShoppingBag className="size-4" aria-hidden />
            {count > 0 ? (
              <span className="label absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center bg-ink px-1 text-[10px] tracking-normal text-paper">
                {count}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center border border-rule text-ink lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav id="mobile-menu" aria-label="Móvil" className="border-t border-rule bg-paper lg:hidden">
          <ul className="mx-auto max-w-[1320px] px-5 py-4 sm:px-8">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="display block py-3 text-4xl text-ink"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
