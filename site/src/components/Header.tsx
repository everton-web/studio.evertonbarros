"use client";

import { useState, useEffect, useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
} from "framer-motion";
import { TriangleIcon } from "./TriangleIcon";
import { PromoBanner } from "./PromoBanner";
import { MenuOverlay } from "./MenuOverlay";
import { useLang } from "@/context/LanguageContext";

export function Header() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const { scrollY } = useScroll();
  const progress = useTransform(scrollY, [0, 180], [0, 1]);
  const alpha = useTransform(progress, [0, 1], [0, 0.85]);
  const blur = useTransform(progress, [0, 1], [0, 22]);
  const border = useTransform(progress, [0, 1], [0, 0.08]);

  const background = useMotionTemplate`rgba(10,10,11,${alpha})`;
  const backdropFilter = useMotionTemplate`blur(${blur}px)`;
  const WebkitBackdropFilter = useMotionTemplate`blur(${blur}px)`;
  const borderBottom = useMotionTemplate`1px solid rgba(255,255,255,${border})`;

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const update = () => {
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <motion.header
        ref={headerRef}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="fixed top-0 left-0 w-full z-[1000]"
      >
        <PromoBanner variant="top" />
        <motion.div
          className="container-site flex items-center justify-between"
          style={{
            height: "96px",
            background,
            backdropFilter,
            WebkitBackdropFilter,
            borderBottom,
          }}
        >
          <a
            href="#hero"
            className="flex items-center gap-2 font-semibold tracking-tight text-[var(--color-text)]"
          >
            <TriangleIcon className="w-4 h-4" />
            everton.
          </a>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] text-[var(--color-text)] transition-colors duration-300 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
            style={{
              padding: "10px 22px",
              fontSize: "0.85rem",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            <span>{t.menu.label}</span>
            <span
              className="w-[6px] h-[6px] rounded-full"
              style={{ background: "var(--color-accent)" }}
            />
          </button>
        </motion.div>
      </motion.header>

      <MenuOverlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}
