"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface Props {
  children: ReactNode;
  className?: string;
  as?: "a" | "button";
  href?: string;
  target?: string;
  rel?: string;
  strength?: number;
  style?: React.CSSProperties;
}

const springConfig = { damping: 15, stiffness: 300, mass: 0.2 };

export function MagneticButton({
  children,
  className,
  as = "a",
  strength = 0.3,
  style: externalStyle,
  ...props
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = e.clientX - (rect.left + rect.width / 2);
    const cy = e.clientY - (rect.top + rect.height / 2);
    x.set(cx * strength);
    y.set(cy * strength);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  const Component = motion[as] as typeof motion.a;

  return (
    <Component
      ref={ref as React.RefObject<HTMLAnchorElement>}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ ...externalStyle, x: springX, y: springY }}
      {...props}
    >
      {children}
    </Component>
  );
}
