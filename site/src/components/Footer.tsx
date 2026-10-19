"use client";

import { TriangleIcon } from "./TriangleIcon";
import { LineReveal } from "./TextReveal";
import { MagneticButton } from "./MagneticButton";
import { HeroWaves } from "./HeroWaves";
import { useLang } from "@/context/LanguageContext";
import { semViuva } from "@/lib/texto";

const socialLinks = [
  {
    label: "Behance",
    href: "https://www.behance.net/evertonbritoweb",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.5 11c1.38 0 2.5-1.12 2.5-2.5S8.88 6 7.5 6H3v5h4.5zM3 18h5c1.38 0 2.5-1.12 2.5-2.5S9.38 13 8 13H3v5zm12-8.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5h-5zM21 12.5c0 2.76-2.24 5-5 5s-5-2.24-5-5h10zM15 3h5v1.5h-5V3z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/evertonbritoweb/",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export function Footer() {
  const { t } = useLang();

  return (
    <footer className="relative overflow-hidden" style={{ background: "var(--color-bg)" }}>
      {/* mesmas ondas do hero, espelhadas: sobem do pé e atravessam o CTA até o rodapé */}
      <HeroWaves base />
      {/* véu no fim do rodapé: desfoque + escurecimento graduais para as informações ficarem legíveis */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[48%]"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, rgba(10,10,11,0.75) 45%, var(--color-bg) 85%)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          maskImage: "linear-gradient(to bottom, transparent 0%, #000 40%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 40%)",
        }}
      />
      <section
        className="relative z-[2]"
        style={{ padding: "var(--section-pad) 0" }}
      >
        <div className="container-site flex flex-col items-center text-center">
          <LineReveal
            as="h2"
            lines={[
              t.footer.ctaBefore,
              <span key="accent" className="serif">
                {semViuva(t.footer.ctaAccent)}
              </span>,
            ]}
            className="mb-10"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(2.4rem, 6vw, 5.25rem)",
              fontWeight: 500,
              lineHeight: 1,
              letterSpacing: "-0.075em",
              textAlign: "center",
            }}
          />

          <div className="flex flex-wrap items-center justify-center gap-6">
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
          </div>
        </div>
      </section>

      <div className="divider" />

      <div
        className="relative z-[2]"
        style={{ maxWidth: "var(--container-max)", marginInline: "auto", padding: "clamp(3rem, 6vh, 5rem) var(--gutter) clamp(2rem, 4vh, 3rem)" }}
      >
        <div className="flex items-start justify-between gap-16 max-md:flex-col max-md:gap-10 mb-12 max-md:mb-8">
          <div>
            <a href="#" className="inline-flex items-center gap-2 font-semibold text-[var(--color-text)] mb-4">
              <TriangleIcon className="w-4 h-4" />
              everton.
            </a>
            <p className="text-[0.8rem] text-[var(--color-text-dim)] max-w-[260px]" style={{ lineHeight: 1.6 }}>
              {t.footer.tagline}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-all"
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>

        <div className="divider mb-6" />

        <div className="flex items-center justify-between max-md:flex-col max-md:gap-4 max-md:text-center">
          <p className="text-[0.7rem] text-[var(--color-text-dim)]">
            &copy; 2026 Everton Brito. {t.footer.rights}
          </p>
          <a
            href="#hero"
            className="flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.1em] text-[var(--color-text-dim)] hover:text-[var(--color-accent)] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m18 15-6-6-6 6" />
            </svg>
            {t.footer.backToTop}
          </a>
        </div>
      </div>
    </footer>
  );
}
