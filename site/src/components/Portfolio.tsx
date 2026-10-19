"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import Image from "next/image";
import { projects } from "@/data/projects";
import { AnimatedSection } from "./AnimatedSection";
import { TriangleIcon } from "./TriangleIcon";
import { LineReveal } from "./TextReveal";
import { useLang } from "@/context/LanguageContext";
import { semViuva } from "@/lib/texto";

const springConfig = { damping: 20, stiffness: 200, mass: 0.5 };

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const restRatios = ["16 / 10", "4 / 3", "16 / 10", "4 / 3", "16 / 10", "4 / 3"];

function ProjectCard({
  project,
  featured = false,
  ratio = "16 / 10",
}: {
  project: (typeof projects)[0];
  featured?: boolean;
  ratio?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const imgX = useMotionValue(0);
  const imgY = useMotionValue(0);
  const springX = useSpring(imgX, springConfig);
  const springY = useSpring(imgY, springConfig);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const rawParallaxY = useTransform(scrollYProgress, [0, 1], [18, -18]);
  const parallaxY = reduced ? 0 : rawParallaxY;

  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    imgX.set(cx * -10);
    imgY.set(cy * -10);
  };

  const handleLeave = () => {
    setHovered(false);
    imgX.set(0);
    imgY.set(0);
  };

  return (
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <motion.div
        ref={ref}
        onMouseEnter={() => setHovered(true)}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
        className="relative rounded-[14px] overflow-hidden"
        style={{
          aspectRatio: featured ? "21 / 10" : ratio,
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <motion.div
          className="absolute inset-[-10px]"
          style={{ y: parallaxY }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ x: springX, y: springY, scale: hovered ? 1.06 : 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <Image
              src={project.cover}
              alt={project.title}
              fill
              className="object-cover"
              sizes={featured ? "100vw" : "(max-width: 768px) 100vw, 50vw"}
              priority={featured}
            />
          </motion.div>
        </motion.div>

        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{ backgroundImage: GRAIN, opacity: 0.05, mixBlendMode: "overlay" }}
        />

        <div
          className="absolute inset-0 flex items-end p-8 max-md:p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-400 z-[2]"
          style={{
            background: "linear-gradient(to top, rgba(10,10,11,0.95) 0%, rgba(10,10,11,0.5) 40%, transparent 100%)",
          }}
        >
          <div className="flex items-end justify-between w-full max-md:flex-col max-md:items-start max-md:gap-2">
            <div>
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)] block mb-1">
                {semViuva(project.category)}
              </span>
              <h3
                className="text-[var(--color-text)] font-medium"
                style={{ fontSize: featured ? "1.5rem" : "1.1rem", letterSpacing: "-0.01em" }}
              >
                {semViuva(project.title)}
              </h3>
            </div>
            <span className="text-[0.75rem] text-[var(--color-text-dim)]">
              {project.year}
            </span>
          </div>
        </div>
      </motion.div>
    </a>
  );
}

function SeeAllCard() {
  const { t } = useLang();
  return (
    <a
      href="https://www.behance.net/evertonbritoweb"
      target="_blank"
      rel="noopener noreferrer"
      data-cursor={t.cursor.open}
      className="group flex items-center justify-between gap-4 rounded-[14px] px-8 py-6 max-md:px-6 transition-colors duration-300 hover:border-[var(--color-border-active)]"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <span
        className="text-[var(--color-text)]"
        style={{ fontSize: "clamp(1.5rem, 3vw, 2.4rem)", fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1.1 }}
      >
        {t.portfolio.seeAll}
      </span>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[var(--color-accent)] shrink-0 group-hover:translate-x-1 transition-transform duration-500"
        aria-hidden
      >
        <path d="m7 17 9.2-9.2M17 17V8H8" />
      </svg>
    </a>
  );
}

export function Portfolio() {
  const [featured, ...rest] = projects;
  const { t } = useLang();

  return (
    <section
      id="portfolio"
      style={{ background: "var(--color-bg)", padding: "var(--section-pad) 0" }}
    >
      <div className="relative z-[2] container-site">
        <AnimatedSection>
          <div className="flex items-center gap-6 mb-16 max-md:mb-10">
            <span className="section-number">02</span>
            <div className="divider-accent" />
            <span className="section-label">
              <TriangleIcon className="w-3 h-3" />
              {t.portfolio.label}
            </span>
          </div>

          <div className="flex items-end justify-between gap-8 mb-16 max-md:flex-col max-md:items-start max-md:gap-4">
            <LineReveal
              lines={[
                t.portfolio.titleBefore,
                <span key="accent" className="serif">{t.portfolio.titleAccent}</span>,
              ]}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(2.4rem, 6vw, 5.25rem)",
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: "-0.075em",
              }}
            />
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-7 py-3 text-sm font-medium text-[var(--color-text)] border border-[var(--color-border)] rounded-full hover:border-[var(--color-text)] transition-all hover:-translate-y-0.5 group"
            >
              {t.portfolio.cta}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
                <path d="m7 17 9.2-9.2M17 17V8H8" />
              </svg>
            </a>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mb-6">
          <ProjectCard project={featured} featured />
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rest.map((project, i) => (
            <AnimatedSection key={project.slug} delay={0.05 * (i + 1)}>
              <ProjectCard project={project} ratio={restRatios[i] ?? "16 / 10"} />
            </AnimatedSection>
          ))}
          <AnimatedSection delay={0.05 * (rest.length + 1)} className="md:col-span-2">
            <SeeAllCard />
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
