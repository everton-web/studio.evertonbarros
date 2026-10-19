"use client";

import { useEffect, useRef, useState } from "react";
import type { Area, Falta, RelatorioPublico } from "@/lib/relatorio";
import {
  AREA_TITULO,
  PREMISSAS,
  SEGMENTO_ROTULO,
  doresVisiveis,
} from "@/lib/relatorio";
import { TriangleIcon } from "@/components/TriangleIcon";
import { semViuva } from "@/lib/texto";
import styles from "./RelatorioView.module.css";

const WHATSAPP_NUMBER = "5571999261967";
const CIRCUMFERENCE = 339.3;

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function scoreLabel(pontuacao: number): string {
  if (pontuacao >= 75) {
    return "Presença digital forte. O foco agora é transformar essa base em ainda mais clientes.";
  }
  if (pontuacao >= 50) {
    return "Base sólida, com espaço para crescer. Sua presença já tem fundação saudável: o foco é transformar isso em mais clientes encontrando você.";
  }
  return "Há muito espaço para crescer. Sua presença digital hoje deixa clientes de fora. Dá para mudar isso.";
}

function formatPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function readNumber(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) || n < 0 ? 0 : n;
}

function groupByArea(faltas: Falta[]): { area: Area; faltas: Falta[] }[] {
  const order: Area[] = [];
  const map = new Map<Area, Falta[]>();
  for (const f of faltas) {
    if (!map.has(f.area)) {
      map.set(f.area, []);
      order.push(f.area);
    }
    map.get(f.area)!.push(f);
  }
  return order.map((area) => ({ area, faltas: map.get(area)! }));
}

export function RelatorioView({
  data,
  temDetalhado = false,
}: {
  data: RelatorioPublico;
  temDetalhado?: boolean;
}) {
  const premissas = PREMISSAS[data.segmento];
  const dores = doresVisiveis(data.faltas);
  const grupos = groupByArea(data.faltas);

  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [buscas, setBuscas] = useState<number>(premissas.buscas);
  const [ticket, setTicket] = useState<number>(premissas.ticket);

  const ringRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const resultRef = useRef<HTMLSpanElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const displayRef = useRef(0);

  useEffect(() => {
    const target = data.pontuacao / 100;
    const duration = 1400;
    let raf = 0;
    const start = performance.now();
    const step = (ts: number) => {
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = String(
          CIRCUMFERENCE * (1 - target * eased),
        );
      }
      if (numRef.current) {
        numRef.current.textContent = String(Math.round(data.pontuacao * eased));
      }
      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        if (ringRef.current) {
          ringRef.current.style.strokeDashoffset = String(
            CIRCUMFERENCE * (1 - target),
          );
        }
        if (numRef.current) {
          numRef.current.textContent = String(data.pontuacao);
        }
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [data.pontuacao]);

  useEffect(() => {
    const n = checked.size;
    const target =
      n === 0
        ? 0
        : Math.round(
            buscas * premissas.clique * premissas.conversao * ticket,
          );

    if (placeholderRef.current) {
      placeholderRef.current.style.display = n === 0 ? "block" : "none";
    }

    if (animRef.current) cancelAnimationFrame(animRef.current);

    if (target === 0) {
      displayRef.current = 0;
      if (resultRef.current) resultRef.current.textContent = currency.format(0);
      return;
    }

    const from = displayRef.current;
    const duration = 900;
    const start = performance.now();
    const step = (ts: number) => {
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(from + (target - from) * eased);
      displayRef.current = val;
      if (resultRef.current) resultRef.current.textContent = currency.format(val);
      if (p < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        displayRef.current = target;
        if (resultRef.current) {
          resultRef.current.textContent = currency.format(target);
        }
        animRef.current = null;
      }
    };
    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [checked, buscas, ticket, premissas.clique, premissas.conversao, premissas.ticket]);

  function toggle(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const msg = `Olá, Everton! Vi o diagnóstico da ${data.empresa} e quero conversar.`;
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

  return (
    <div className={styles.root}>
      <header className={styles.siteHeader}>
        <div className={styles.wrap}>
          <div className={styles.brand}>
            <span className={styles.mark} aria-hidden="true">
              <TriangleIcon className="" />
            </span>
            <span className={styles.wordmark}>
              everton<span className={styles.dot}>.</span>
            </span>
            <span className={styles.domain}>evertonbrito.com</span>
          </div>

          <div className={styles.hero}>
            <span className={styles.microLabel}>Diagnóstico de presença digital</span>
            <h1>{semViuva(data.empresa)}</h1>
            <p className={styles.metaLine}>
              <span>{data.cidade}</span>
              <span className={styles.sep}>·</span>
              <span>{dateFmt.format(new Date(data.geradoEm + "T12:00:00"))}</span>
            </p>
            {temDetalhado ? (
              <a className={styles.btnDetalhado} href={`/relatorio/${data.slug}/detalhado`}>
                Ver relatório detalhado
                <span aria-hidden="true">→</span>
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main>
        <section className={styles.score}>
          <div className={styles.wrap}>
            <div className={styles.scoreCard}>
              <div className={styles.scoreTop}>
                <div
                  className={styles.ring}
                  aria-label={`Nota de presença digital: ${data.pontuacao} de 100`}
                >
                  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient
                        id="scoreGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#FF4000" />
                        <stop offset="100%" stopColor="#FF8A5C" />
                      </linearGradient>
                    </defs>
                    <circle className={styles.track} cx="60" cy="60" r="54" />
                    <circle
                      ref={ringRef}
                      className={styles.progress}
                      cx="60"
                      cy="60"
                      r="54"
                    />
                  </svg>
                  <div className={styles.value}>
                    <span ref={numRef} className={styles.num}>
                      {data.pontuacao}
                    </span>
                    <span className={styles.total}>/ 100</span>
                  </div>
                </div>
                <div className={styles.scoreLabel}>{scoreLabel(data.pontuacao)}</div>
              </div>

              <div className={styles.strengths}>
                <h2>{semViuva("O que já está forte")}</h2>
                <ul>
                  {data.fortes.map((f) => (
                    <li key={f}>
                      <span className={styles.check} aria-hidden="true">
                        <svg viewBox="0 0 16 16" fill="none">
                          <path d="M3 8.5L6.5 12L13 4.5" />
                        </svg>
                      </span>
                      <span>{semViuva(f)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.opportunities}>
          <div className={styles.wrap}>
            <div className={styles.sectionHead}>
              <span className={styles.microLabel}>Oportunidades</span>
              <h2>{semViuva("O que o seu negócio pode ganhar")}</h2>
              <p>
                Veja, em linguagem simples, o que a {data.empresa} pode destravar para
                ser vista, e escolhida, por quem procura {SEGMENTO_ROTULO[data.segmento]}{" "}
                em {data.cidade}.
              </p>
            </div>

            {grupos.map(({ area, faltas }) => (
              <div className={styles.oppGroup} key={area}>
                <h3>{semViuva(AREA_TITULO[area])}</h3>
                {faltas.map((f) => (
                  <div className={styles.oppCard} key={f.tag}>
                    <span className={styles.tag}>{f.tag}</span>
                    <p>{semViuva(f.oportunidade)}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.pains}>
          <div className={styles.wrap}>
            <div className={styles.sectionHead}>
              <span className={styles.microLabel}>Diagnóstico rápido</span>
              <h2>{semViuva("Marque o que dói no seu dia a dia")}</h2>
              <p>Toque nos itens que você reconhece. Isso ajuda a enxergar o tamanho da oportunidade.</p>
            </div>

            <div className={styles.painList}>
              {dores.map((d) => (
                <label className={styles.painItem} key={d.id}>
                  <input
                    type="checkbox"
                    checked={checked.has(d.id)}
                    onChange={() => toggle(d.id)}
                  />
                  <span className={styles.painBox}>
                    <span className={styles.box} aria-hidden="true">
                      <svg viewBox="0 0 16 16" fill="none">
                        <path d="M3 8.5L6.5 12L13 4.5" />
                      </svg>
                    </span>
                    <span className={styles.label}>{semViuva(d.texto)}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.calc}>
          <div className={styles.wrap}>
            <div className={styles.calcCard}>
              <div className={styles.sectionHead}>
                <span className={styles.microLabel}>Potencial de receita</span>
                <h2>{semViuva("Quanto você pode estar deixando de ganhar por mês")}</h2>
              </div>

              <div className={styles.formula}>
                <code>buscas/mês</code> × <code>taxa de clique</code> ×{" "}
                <code>conversão</code> × <code>ticket médio</code>
              </div>

              <div className={styles.resultRow}>
                <span ref={resultRef} className={styles.resultValue}>
                  R$ 0
                </span>
                <span className={styles.resultUnit}>/ mês</span>
              </div>
              <div ref={placeholderRef} className={styles.resultPlaceholder}>
                Marque ao lado o que você reconhece
              </div>

              <div className={styles.chip}>
                <span className={styles.dot} aria-hidden="true"></span>
                <span>
                  {checked.size} de {dores.length} sinais reconhecidos
                </span>
              </div>

              <div className={styles.inputs}>
                <div className={styles.inputRow}>
                  <label htmlFor="buscas">Buscas locais / mês</label>
                  <div className={styles.field}>
                    <input
                      id="buscas"
                      type="number"
                      value={buscas}
                      min={0}
                      step={10}
                      inputMode="numeric"
                      onChange={(e) => setBuscas(readNumber(e.target.value))}
                    />
                  </div>
                </div>
                <div className={styles.inputRow}>
                  <label htmlFor="ticket">Ticket médio</label>
                  <div className={styles.field}>
                    <span className={styles.prefix}>R$</span>
                    <input
                      id="ticket"
                      type="number"
                      value={ticket}
                      min={0}
                      step={10}
                      inputMode="numeric"
                      onChange={(e) => setTicket(readNumber(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <p className={styles.fixedNote}>
                Premissas do segmento de {SEGMENTO_ROTULO[data.segmento]}:{" "}
                <strong>taxa de clique {formatPct(premissas.clique)}</strong> e{" "}
                <strong>conversão conservadora {formatPct(premissas.conversao)}</strong>{" "}
                (fixas).
              </p>

              <p className={styles.disclaimer}>
                Estimativa de marketing para fins ilustrativos. Não é promessa de
                receita nem garantia de resultado. Reflete o que o negócio
                potencialmente deixa de capturar sem uma presença digital completa.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <div className={styles.wrap}>
            <a
              className={styles.btnWhatsapp}
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.15h-.01c-1.52 0-3.01-.41-4.3-1.18l-.31-.18-3.12.82.83-3.04-.2-.31a7.93 7.93 0 0 1-1.22-4.28c0-4.43 3.61-8.04 8.04-8.04 2.15 0 4.17.84 5.69 2.36a8 8 0 0 1 2.36 5.68c0 4.44-3.61 8.05-8.06 8.05Zm4.41-6.03c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
              </svg>
              Conversar com Everton no WhatsApp
            </a>
            <p className={styles.ctaNote}>Resposta rápida, sem compromisso.</p>
          </div>
        </section>
      </main>

      <footer className={styles.siteFooter}>
        <div className={styles.wrap}>
          <div className={styles.brand}>
            <span className={styles.mark} aria-hidden="true">
              <TriangleIcon className="" />
            </span>
            <span className={styles.wordmark}>
              everton<span className={styles.dot}>.</span>
            </span>
            <span className={styles.domain}>evertonbrito.com</span>
          </div>
          <p>Diagnóstico de presença digital: documento ilustrativo.</p>
        </div>
      </footer>
    </div>
  );
}
