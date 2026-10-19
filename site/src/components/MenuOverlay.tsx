"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PromoBanner } from "./PromoBanner";
import { LanguageToggle } from "./LanguageToggle";
import { useLang } from "@/context/LanguageContext";

const ease = [0.16, 1, 0.3, 1] as const;

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease },
  },
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MenuOverlay({ open, onClose }: Props) {
  const { t } = useLang();
  const reduced = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[2000] flex flex-col overflow-y-auto"
          style={{ background: "var(--color-bg)" }}
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease }}
          role="dialog"
          aria-modal="true"
          aria-label={t.menu.label}
        >
          <PromoBanner variant="top" />

          <div className="flex-1 relative flex flex-col items-center justify-center px-8">
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t.menu.close}
              className="absolute top-6 right-6 flex items-center justify-center w-10 h-10 rounded-full text-[var(--color-text)] text-lg transition-colors duration-300 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]"
              style={{ border: "1px solid var(--color-border)" }}
            >
              ✕
            </button>

            {reduced ? (
              <nav className="flex flex-col items-center gap-5">
                {t.menu.items.map((item) => (
                  <a
                    key={item.anchor}
                    href={item.anchor}
                    onClick={onClose}
                    className="block text-[var(--color-text)] transition-colors duration-300 hover:text-[var(--color-accent)]"
                    style={{
                      fontSize: "clamp(2.2rem, 6vw, 4rem)",
                      fontWeight: 600,
                      lineHeight: 1.1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            ) : (
              <motion.nav
                className="flex flex-col items-center gap-5"
                variants={listVariants}
                initial="hidden"
                animate="visible"
              >
                {t.menu.items.map((item) => (
                  <motion.a
                    key={item.anchor}
                    href={item.anchor}
                    onClick={onClose}
                    variants={itemVariants}
                    whileHover={{ x: 8 }}
                    className="block text-[var(--color-text)] transition-colors duration-300 hover:text-[var(--color-accent)]"
                    style={{
                      fontSize: "clamp(2.2rem, 6vw, 4rem)",
                      fontWeight: 600,
                      lineHeight: 1.1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {item.label}
                  </motion.a>
                ))}
              </motion.nav>
            )}

            <div className="mt-14">
              <LanguageToggle />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
