"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef, type CSSProperties, type ReactNode } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

type Tag = "h1" | "h2" | "h3" | "p";

interface LineRevealProps {
  lines: ReactNode[];
  className?: string;
  delay?: number;
  stagger?: number;
  as?: Tag;
  style?: CSSProperties;
}

export function LineReveal({
  lines,
  className,
  delay = 0,
  stagger = 0.12,
  as = "h2",
  style,
}: LineRevealProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px -10% 0px" });
  const Tag = as;

  if (reduced) {
    return (
      <Tag className={className} style={style}>
        {lines.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </Tag>
    );
  }

  return (
    <Tag ref={ref as never} className={className} style={style}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.18em] -mb-[0.18em]">
          <motion.span
            custom={i}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={{
              hidden: { y: "110%" },
              visible: (idx: number) => ({
                y: "0%",
                transition: {
                  duration: 0.9,
                  ease,
                  delay: delay + idx * stagger,
                },
              }),
            }}
            className="block"
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

interface WordToken {
  t: string;
  accent?: boolean;
}

interface WordRevealProps {
  text?: string;
  segments?: WordToken[];
  className?: string;
  delay?: number;
  stagger?: number;
  style?: CSSProperties;
  progress?: MotionValue<number>;
}

function RevealWord({
  progress,
  index,
  total,
  accent,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  total: number;
  accent: boolean;
  children: ReactNode;
}) {
  const opacity = useTransform(progress, (p) => {
    const raw = (p * (total + 4) - index) / 4;
    const clamped = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    return 0.34 + 0.66 * clamped;
  });

  return (
    <motion.span
      style={{ opacity }}
      className={`inline-block ${accent ? "serif" : ""}`}
    >
      {children}
    </motion.span>
  );
}

export function WordReveal({
  text,
  segments,
  className,
  delay = 0,
  stagger = 0.03,
  style,
  progress,
}: WordRevealProps) {
  const reduced = useReducedMotion();

  const tokens: WordToken[] = segments ?? [{ t: text ?? "" }];
  const words: { t: string; accent: boolean }[] = [];
  for (const seg of tokens) {
    for (const part of seg.t.split(" ")) {
      if (part === "") continue;
      words.push({ t: part, accent: !!seg.accent });
    }
  }

  for (let i = words.length - 1; i > 0; i--) {
    if (/^[.,;:!?…]+$/.test(words[i].t)) {
      words[i - 1] = { ...words[i - 1], t: words[i - 1].t + words[i].t };
      words.splice(i, 1);
    }
  }

  if (reduced) {
    return (
      <span className={className} style={style}>
        {tokens.map((seg, i) => (
          <span key={i} className={seg.accent ? "serif" : undefined}>
            {seg.t}{" "}
          </span>
        ))}
      </span>
    );
  }

  if (progress) {
    return (
      <span className={className} style={style}>
        {words.map((word, i) => (
          <RevealWord
            key={i}
            progress={progress}
            index={i}
            total={words.length}
            accent={word.accent}
          >
            {word.t + (i < words.length - 1 ? "\u00A0" : "")}
          </RevealWord>
        ))}
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.18em] -mb-[0.18em]">
          <motion.span
            custom={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
              hidden: { y: "110%" },
              visible: (idx: number) => ({
                y: "0%",
                transition: { duration: 0.9, ease, delay: delay + idx * stagger },
              }),
            }}
            className={`inline-block ${word.accent ? "serif" : ""}`}
          >
            {word.t + (i < words.length - 1 ? "\u00A0" : "")}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
