"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { DotGrid } from "@/components/DotGrid";
import { useLang, LanguageProvider } from "@/context/LanguageContext";

function NotFoundInner() {
  const { t } = useLang();
  const lanternRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = lanternRef.current;
    if (!el) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (reduced) {
      el.style.setProperty("--lx", "50%");
      el.style.setProperty("--ly", "50%");
      el.style.opacity = "0.35";
      return;
    }

    if (fine) {
      let raf = 0;
      let targetX = 50;
      let targetY = 50;
      let currentX = 50;
      let currentY = 50;

      const move = (e: PointerEvent) => {
        targetX = (e.clientX / window.innerWidth) * 100;
        targetY = (e.clientY / window.innerHeight) * 100;
      };

      const tick = () => {
        currentX += (targetX - currentX) * 0.1;
        currentY += (targetY - currentY) * 0.1;
        el.style.setProperty("--lx", `${currentX}%`);
        el.style.setProperty("--ly", `${currentY}%`);
        raf = requestAnimationFrame(tick);
      };

      window.addEventListener("pointermove", move);
      raf = requestAnimationFrame(tick);

      return () => {
        window.removeEventListener("pointermove", move);
        cancelAnimationFrame(raf);
      };
    }

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const s = (now - start) / 1000;
      const x = 50 + Math.cos(s * 0.4) * 30;
      const y = 50 + Math.sin(s * 0.4) * 30;
      el.style.setProperty("--lx", `${x}%`);
      el.style.setProperty("--ly", `${y}%`);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <main
      className="relative min-h-screen overflow-hidden flex flex-col"
      style={{ background: "#040404" }}
    >
      <DotGrid />

      <div
        ref={lanternRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          background:
            "radial-gradient(circle clamp(200px, 30vw, 420px) at var(--lx, 50%) var(--ly, 50%), rgba(255,64,0,0.22), transparent 65%)",
        }}
      />

      <div className="relative z-[3] flex flex-col items-center justify-center text-center px-8 flex-1">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-6">
          404
        </span>

        <h1
          className="max-w-[720px] mb-10"
          style={{
            fontSize: "clamp(1.8rem, 5vw, 3.4rem)",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            textWrap: "balance",
          }}
        >
          {t.notFound.title}
        </h1>

        <Link
          href="/"
          data-cursor={t.cursor.open}
          className="group inline-flex items-center gap-3 bg-[var(--color-text)] text-[var(--color-bg)] rounded-full font-medium text-sm"
          style={{ padding: "13px 30px" }}
        >
          {t.notFound.cta}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:translate-x-0.5 transition-transform"
          >
            <path d="m7 17 9.2-9.2M17 17V8H8" />
          </svg>
        </Link>
      </div>
    </main>
  );
}

export default function NotFound() {
  return (
    <LanguageProvider>
      <NotFoundInner />
    </LanguageProvider>
  );
}
