"use client";

import { useEffect, useRef } from "react";

export function DotGrid() {
  const torchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = torchRef.current;
    if (!el) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (reduced || !fine) {
      el.style.setProperty("--mx", "50%");
      el.style.setProperty("--my", "50%");
      el.style.opacity = "0";
      return;
    }

    let raf = 0;
    let lit = false;
    let targetX = 50;
    let targetY = 50;
    let currentX = 50;
    let currentY = 50;

    const move = (e: PointerEvent) => {
      if (!lit) {
        lit = true;
        el.style.opacity = "1";
      }
      targetX = (e.clientX / window.innerWidth) * 100;
      targetY = (e.clientY / window.innerHeight) * 100;
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      el.style.setProperty("--mx", `${currentX}%`);
      el.style.setProperty("--my", `${currentY}%`);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", move);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden
      role="presentation"
      className="fixed inset-0 z-[1] pointer-events-none"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div
        ref={torchRef}
        className="absolute inset-0"
        style={{
          opacity: 0,
          transition: "opacity 0.3s ease",
          background:
            "radial-gradient(circle 220px at var(--mx, 50%) var(--my, 50%), rgba(255,64,0,0.28), transparent 70%)",
        }}
      />
    </div>
  );
}
