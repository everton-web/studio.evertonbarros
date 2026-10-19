"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useLang } from "@/context/LanguageContext";

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame: number;
    const duration = 1800;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

export function Metrics() {
  const { t } = useLang();

  const metrics = [
    { value: 200, suffix: "+", label: t.metrics.projects },
    { value: 7, suffix: "+", label: t.metrics.years },
    { value: 100, suffix: "%", label: t.metrics.remote },
  ];

  return (
    <section className="relative" style={{ background: "var(--color-bg-soft)" }}>
      <div className="divider" />
      <div
        className="relative z-[2] grid grid-cols-3 max-md:grid-cols-1 max-md:gap-8"
        style={{ maxWidth: "var(--container-max)", marginInline: "auto", padding: "clamp(3rem, 5vh, 4rem) var(--gutter)" }}
      >
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
            className="text-center max-md:flex max-md:items-center max-md:gap-4 max-md:text-left"
          >
            <p
              className="font-semibold text-[var(--color-text)] max-md:min-w-[80px]"
              style={{ fontSize: "clamp(2rem, 3vw, 2.5rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
            >
              <Counter target={m.value} suffix={m.suffix} />
            </p>
            <p className="text-[0.8rem] text-[var(--color-text-muted)] mt-2 max-md:mt-0">
              {m.label}
            </p>
          </motion.div>
        ))}
      </div>
      <div className="divider" />
    </section>
  );
}
