"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}

export function AnimatedSection({
  children,
  className,
  delay = 0,
  direction = "up",
}: Props) {
  const offsets = {
    up: { x: 0, y: 40 },
    left: { x: -40, y: 0 },
    right: { x: 40, y: 0 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...offsets[direction], filter: "blur(4px)" }}
      whileInView={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
        delay,
        filter: { duration: 0.6 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
