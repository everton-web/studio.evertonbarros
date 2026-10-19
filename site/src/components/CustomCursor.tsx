"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  const dotX = useMotionValue(-100);
  const dotY = useMotionValue(-100);
  const ringX = useMotionValue(-100);
  const ringY = useMotionValue(-100);
  const targetRef = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => setEnabled(fine.matches && !reduced.matches);
    update();
    fine.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      fine.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let raf = 0;

    const move = (e: MouseEvent) => {
      dotX.set(e.clientX);
      dotY.set(e.clientY);
      targetRef.current = { x: e.clientX, y: e.clientY };
    };

    const tick = () => {
      const curX = ringX.get();
      const curY = ringY.get();
      const tx = targetRef.current.x;
      const ty = targetRef.current.y;
      ringX.set(curX + (tx - curX) * 0.16);
      ringY.set(curY + (ty - curY) * 0.16);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", move);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf);
    };
  }, [enabled, dotX, dotY, ringX, ringY]);

  useEffect(() => {
    if (!enabled) return;

    const over = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(
        "a, button, [data-cursor]",
      ) as HTMLElement | null;
      if (el) {
        setHovered(true);
        setLabel(el.getAttribute("data-cursor"));
      } else {
        setHovered(false);
        setLabel(null);
      }
    };

    document.addEventListener("mouseover", over);
    return () => document.removeEventListener("mouseover", over);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full"
        style={{
          x: dotX,
          y: dotY,
          translateX: "-50%",
          translateY: "-50%",
          width: 8,
          height: 8,
          backgroundColor: "#FF4000",
        }}
      />
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9998] rounded-full flex items-center justify-center"
        style={{
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
          width: hovered ? 56 : 34,
          height: hovered ? 56 : 34,
          border: "1px solid rgba(255,64,0,0.7)",
          transition:
            "width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {label ? (
          <span
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#FF4000",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        ) : null}
      </motion.div>
      <style jsx global>{`
        @media (pointer: fine) {
          * {
            cursor: none !important;
          }
        }
      `}</style>
    </>
  );
}
