"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { TriangleIcon } from "./TriangleIcon";
import { MagneticButton } from "./MagneticButton";
import { HeroWaves } from "./HeroWaves";
import { useLang } from "@/context/LanguageContext";

const ease = [0.16, 1, 0.3, 1] as const;

function colarUltimaPalavra(
  linha: ReadonlyArray<{ t: string; accent: boolean }>,
): { t: string; accent: boolean }[] {
  const copia = linha.map((seg) => ({ ...seg }));
  for (let j = copia.length - 1; j >= 0; j--) {
    const seg = copia[j];
    const idx = seg.t.lastIndexOf(" ");
    if (idx !== -1) {
      seg.t = seg.t.slice(0, idx) + "\u00A0" + seg.t.slice(idx + 1);
      break;
    }
  }
  return copia;
}

const lineReveal = {
  hidden: { y: "110%", opacity: 0 },
  visible: (i: number) => ({
    y: "0%",
    opacity: 1,
    transition: { duration: 1.1, ease, delay: 0.6 + i * 0.12 },
  }),
};

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { t, lang } = useLang();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const contentY = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <section
      ref={ref}
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "var(--color-bg)", paddingTop: "var(--header-h)" }}
    >
      <HeroWaves />
      <motion.div
        style={{ y: contentY }}
        className="relative z-[2] container-site text-center flex flex-col items-center mt-[14vh] max-md:mt-[10vh]"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.2 }}
          className="section-label mb-9 max-md:mb-6"
        >
          <TriangleIcon className="w-3 h-3" />
          <span>{t.hero.badge}</span>
        </motion.div>

        <h1
          key={lang}
          className="mb-6 max-md:mb-5"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize:
              "min(clamp(2.2rem, 4.8vw, 5.75rem), calc((100svh - 240px) / 5.5), calc((100vw - 2 * var(--gutter)) / 11))",
            fontWeight: 500,
            lineHeight: 1,
            letterSpacing: "-0.075em",
          }}
        >
          {t.hero.lines.map((rawLine, i) => {
            const line = colarUltimaPalavra(rawLine);
            return (
            <span key={i} className="block overflow-hidden pb-[0.18em] -mb-[0.18em]">
              <motion.span
                custom={i}
                variants={lineReveal}
                initial="hidden"
                animate="visible"
                className="block"
              >
                {line.map((seg, j) =>
                  seg.accent ? (
                    <span key={j} className="serif">
                      {seg.t}
                    </span>
                  ) : (
                    <span key={j}>{seg.t}</span>
                  )
                )}
              </motion.span>
            </span>
            );
          })}
        </h1>

        <motion.p
          key={`sub-${lang}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 1.1 }}
          className="text-[var(--color-text-secondary)] text-[0.95rem] max-md:text-sm mb-9 max-w-[420px]"
          style={{ lineHeight: 1.65 }}
        >
          {t.hero.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 1.3 }}
          className="flex items-center gap-4 max-md:flex-col"
        >
          <MagneticButton
            href="#contact"
            as="a"
            className="group inline-flex items-center gap-3 bg-[var(--color-text)] text-[var(--color-bg)] rounded-full font-medium text-sm"
            style={{ padding: "13px 30px" }}
            data-cursor={t.cursor.open}
          >
            {t.hero.cta}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
              <path d="m7 17 9.2-9.2M17 17V8H8" />
            </svg>
          </MagneticButton>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 right-8 max-md:right-6 z-[3] flex flex-col items-center gap-2"
      >
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.15em] text-[var(--color-text-dim)]" style={{ writingMode: "vertical-rl" }}>
          scroll
        </span>
        <div className="w-px h-8 bg-[var(--color-border)]" />
      </motion.div>
    </section>
  );
}
