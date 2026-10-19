"use client";

import { useRef } from "react";
import { useScroll } from "framer-motion";
import { AnimatedSection } from "./AnimatedSection";
import { WordReveal } from "./TextReveal";
import { TriangleIcon } from "./TriangleIcon";
import { useLang } from "@/context/LanguageContext";

export function About() {
  const { t } = useLang();
  const statementRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: statementRef,
    offset: ["start end", "center center"],
  });

  const metrics = [
    { value: "200", suffix: "+", label: t.metrics.projects },
    { value: "7", suffix: "+", label: t.metrics.years },
    { value: "100", suffix: "%", label: t.metrics.remote },
  ];

  return (
    <section
      id="about"
      style={{ background: "var(--color-bg)", padding: "var(--section-pad) 0" }}
    >
      <div className="relative z-[2] container-site">
        <div className="flex items-start justify-between gap-20 max-lg:flex-col max-lg:gap-12">
          <div className="flex-1 max-w-[820px]">
            <AnimatedSection>
              <div className="flex items-center gap-6 mb-16 max-md:mb-10">
                <span className="section-number">03</span>
                <div className="divider-accent" />
                <span className="section-label">
                  <TriangleIcon className="w-3 h-3" />
                  {t.about.label}
                </span>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.1}>
              <div ref={statementRef}>
                <WordReveal
                  segments={[
                    { t: t.about.statementBefore },
                    { t: t.about.statementStrong, accent: true },
                    { t: t.about.statementMiddle },
                    { t: t.about.statementAccent, accent: true },
                    { t: t.about.statementAfter },
                  ]}
                  progress={scrollYProgress}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "clamp(1.9rem, 4.2vw, 3.5rem)",
                    fontWeight: 400,
                    lineHeight: 1.05,
                    letterSpacing: "-0.06em",
                    color: "var(--color-text-secondary)",
                  }}
                />
              </div>
            </AnimatedSection>
          </div>

          <AnimatedSection delay={0.3} direction="right" className="max-lg:w-full">
            <div
              className="rounded-[14px] p-8 max-lg:p-6"
              style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                minWidth: "300px",
              }}
            >
              <div className="grid grid-cols-3 gap-4 mb-6">
                {metrics.map((m) => (
                  <div key={m.label} className="flex flex-col">
                    <span
                      className="font-semibold text-[var(--color-text)]"
                      style={{
                        fontSize: "clamp(1.4rem, 2vw, 2rem)",
                        letterSpacing: "-0.04em",
                        lineHeight: 1,
                      }}
                    >
                      {m.value}
                      <span className="text-[var(--color-accent)]">{m.suffix}</span>
                    </span>
                    <span
                      className="mt-2 text-[var(--color-text-muted)]"
                      style={{
                        fontSize: "0.68rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        lineHeight: 1.4,
                      }}
                    >
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="divider mb-6" />

              <div className="space-y-4">
                {t.about.skills.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <TriangleIcon className="w-2.5 h-2.5 text-[var(--color-accent)] shrink-0" />
                    <span className="text-sm text-[var(--color-text-secondary)]">{item}</span>
                  </div>
                ))}
              </div>

              <div className="divider my-6" />

              <p
                className="text-[0.75rem] text-[var(--color-text-dim)] whitespace-pre-line"
                style={{ lineHeight: 1.6 }}
              >
                {t.about.footnote}
              </p>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
