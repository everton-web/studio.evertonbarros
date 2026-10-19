"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { AnimatedSection } from "./AnimatedSection";
import { TriangleIcon } from "./TriangleIcon";
import { LineReveal } from "./TextReveal";
import { useLang } from "@/context/LanguageContext";
import { usePromo } from "@/hooks/usePromo";
import { precoComDesconto, formatBRL } from "@/lib/promo";
import { useCambio } from "@/hooks/useCambio";
import { brlParaUsd, formatUSD, TAXA_INTERNACIONAL } from "@/lib/cambio";
import { PromoBanner } from "./PromoBanner";
import { semViuva } from "@/lib/texto";

// Bento na ideia do hunter.prodyai: 6 cartões de tamanhos diferentes, rótulo em cima,
// título e texto embaixo, borda que acende seguindo o cursor (inclusive nos vizinhos).
type Item = {
  label: string;
  title: string;
  text: string;
  price: string;
  priceValue: number;
  note: string;
  from?: boolean;
  promo?: boolean; // entra no desconto do mês (só projetos; consultoria e mentoria ficam fora)
  area: string;
  grande?: boolean;
};

const AREA_CLASS: Record<string, string> = {
  a: "md:[grid-area:a]",
  b: "md:[grid-area:b]",
  c: "md:[grid-area:c]",
  d: "md:[grid-area:d]",
  e: "md:[grid-area:e]",
  f: "md:[grid-area:f]",
};

export function Services() {
  const { t, lang } = useLang();
  const { ativa } = usePromo();
  const cotacao = useCambio(lang === "en");
  // em inglês, com cotação carregada, mostra em dólar com taxas; senão, em real
  const preco = (brl: number) => (cotacao ? formatUSD(brlParaUsd(brl, cotacao.brlPorUsd)) : formatBRL(brl));
  const grid = useRef<HTMLDivElement>(null);
  const [aceso, setAceso] = useState(false);

  const s = t.services;
  const [lp, pv, op, si] = s.core;
  const [cons, ment] = s.special.items;
  type Core = { title: string; result: string; tags: readonly string[]; price: string; priceValue: number };
  type Extra = { title: string; description: string; price: string; priceValue: number; priceNote: string };
  const core = (x: Core, area: string, grande = false): Item => ({
    label: x.tags[0],
    title: x.title,
    text: x.result,
    price: x.price,
    priceValue: x.priceValue,
    note: "",
    from: true,
    promo: true,
    area,
    grande,
  });
  const extra = (x: Extra, area: string): Item => ({
    label: s.special.label,
    title: x.title,
    text: x.description,
    price: x.price,
    priceValue: x.priceValue,
    note: x.priceNote,
    area,
  });
  const itens: Item[] = [
    core(lp, "a"),
    core(op, "b"),
    core(si, "c", true),
    core(pv, "d", true),
    extra(cons, "e"),
    extra(ment, "f"),
  ];

  // posição do cursor relativa a cada cartão: a luz passa de um cartão para o vizinho
  function mover(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || !grid.current) return;
    grid.current.querySelectorAll<HTMLElement>("[data-bento]").forEach((el) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  }

  return (
    <section
      id="services"
      style={{ background: "var(--color-bg-soft)", padding: "var(--section-pad) 0" }}
    >
      <div className="relative z-[2] container-site">
        <AnimatedSection>
          <div className="flex items-center gap-6 mb-16 max-md:mb-10">
            <span className="section-number">01</span>
            <div className="divider-accent" />
            <span className="section-label">
              <TriangleIcon className="w-3 h-3" />
              {s.label}
            </span>
          </div>

          <div className="flex items-end justify-between gap-8 mb-16 max-md:flex-col max-md:items-start max-md:gap-4">
            <LineReveal
              lines={[
                s.titleBefore,
                <span key="accent" className="serif">{s.titleAccent}</span>,
              ]}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(2.4rem, 6vw, 5.25rem)",
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: "-0.075em",
              }}
            />
            <p className="text-[var(--color-text-secondary)] max-w-[340px]" style={{ lineHeight: 1.7 }}>
              {s.intro}
            </p>
          </div>
        </AnimatedSection>

        <PromoBanner variant="inline" />

        <AnimatedSection>
          <div
            ref={grid}
            onPointerMove={mover}
            onPointerEnter={(e) => e.pointerType === "mouse" && setAceso(true)}
            onPointerLeave={() => setAceso(false)}
            className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 bento"
          >
            {itens.map((it, i) => (
              <div
                key={it.title}
                data-bento
                className={`group relative rounded-[18px] p-px ${AREA_CLASS[it.area]}`}
                style={{ background: "var(--color-border)", "--mx": "-999px", "--my": "-999px" } as CSSProperties}
              >
                {/* borda acesa: gradiente radial no cursor, visível só enquanto o mouse está no grid */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-[18px] transition-opacity duration-500"
                  style={{
                    opacity: aceso ? 1 : 0,
                    background:
                      "radial-gradient(260px circle at var(--mx) var(--my), var(--color-accent), transparent 70%)",
                  }}
                />
                <div
                  className={`relative h-full overflow-hidden rounded-[17px] flex flex-col p-7 max-md:p-6 ${it.grande ? "lg:p-9" : ""}`}
                  style={{ background: "var(--color-bg-card)", minHeight: it.grande ? 300 : 250 }}
                >
                  {/* brilho interno suave acompanhando o cursor */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 transition-opacity duration-500"
                    style={{
                      opacity: aceso ? 1 : 0,
                      background:
                        "radial-gradient(420px circle at var(--mx) var(--my), var(--color-accent-subtle), transparent 65%)",
                    }}
                  />

                  <div className="relative flex items-start justify-between gap-4">
                    <span className="text-[0.95rem] text-[var(--color-text-secondary)]">{it.label}</span>
                    <span
                      className="text-[var(--color-text-dim)] opacity-60 group-hover:text-[var(--color-accent)] group-hover:opacity-100 transition-colors duration-300"
                      style={{ fontSize: it.grande ? "2.4rem" : "1.1rem", fontWeight: 300, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="relative mt-auto pt-10">
                    <h3
                      className="text-[var(--color-text)] mb-2"
                      style={{
                        fontSize: it.grande ? "clamp(1.5rem, 2.4vw, 2.1rem)" : "1.3rem",
                        fontWeight: 500,
                        lineHeight: 1.15,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {semViuva(it.title)}
                    </h3>
                    <p
                      className="text-[var(--color-text-secondary)] text-[0.9rem]"
                      style={{ lineHeight: 1.6, maxWidth: it.grande ? 460 : undefined }}
                    >
                      {semViuva(it.text)}
                    </p>

                    <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      {it.from && (
                        <span className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[var(--color-text-dim)]">{s.priceFrom}</span>
                      )}
                      {ativa && it.promo ? (
                        <>
                          <s className="text-[var(--color-text-dim)] text-[0.85rem]">{preco(it.priceValue)}</s>
                          <span className="font-semibold text-[var(--color-accent)]" style={{ fontSize: "1.2rem", letterSpacing: "-0.01em" }}>
                            {preco(precoComDesconto(it.priceValue))}
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold text-[var(--color-text)]" style={{ fontSize: "1.15rem", letterSpacing: "-0.01em" }}>
                          {preco(it.priceValue)}
                        </span>
                      )}
                      {it.note && <span className="text-[0.7rem] text-[var(--color-text-dim)]">{it.note}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {cotacao && (
            <p className="mt-5 text-[0.75rem] text-[var(--color-text-muted)]">
              Prices in US dollars at today&apos;s rate (US$ 1 = R$ {cotacao.brlPorUsd.toFixed(2)}, updated{" "}
              {new Date(cotacao.quando).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}), international fees of {Math.round(TAXA_INTERNACIONAL * 100)}% included.
            </p>
          )}
        </AnimatedSection>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .bento { grid-template-areas: "a b" "c c" "d d" "e f"; }
        }
        @media (min-width: 1024px) {
          .bento { grid-template-areas: "a b c c" "d d c c" "d d e f"; }
        }
      `}</style>
    </section>
  );
}
