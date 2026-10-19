import type {
  ImagemResolvida,
  RelatorioDetalhadoView as Dados,
} from "@/lib/relatorio-detalhado";
import { LineReveal } from "@/components/TextReveal";
import { AnimatedSection } from "@/components/AnimatedSection";
import { TriangleIcon } from "@/components/TriangleIcon";
import { semViuva } from "@/lib/texto";
import styles from "./RelatorioDetalhadoView.module.css";

const WHATSAPP_NUMBER = "5571999261967";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function num(i: number): string {
  return String(i + 1).padStart(2, "0");
}

function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Marca() {
  return (
    <div className={styles.brand}>
      <span className={styles.mark} aria-hidden="true">
        <TriangleIcon className="" />
      </span>
      <span className={styles.wordmark}>
        everton<span className={styles.dot}>.</span>
      </span>
      <span className={styles.domain}>evertonbrito.com</span>
    </div>
  );
}

function Recorte({
  img,
  alt,
  legenda,
}: {
  img: ImagemResolvida;
  alt: string;
  legenda?: string;
}) {
  const retrato = img.height > img.width * 0.9;
  return (
    <figure className={`${styles.figure} ${retrato ? styles.figureRetrato : ""}`}>
      <div className={styles.frame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.src}
          width={img.width}
          height={img.height}
          alt={alt}
          loading="lazy"
          decoding="async"
        />
      </div>
      {legenda ? <figcaption>{legenda}</figcaption> : null}
    </figure>
  );
}

function CabecalhoSecao({
  indice,
  rotulo,
  titulo,
  intro,
}: {
  indice: string;
  rotulo: string;
  titulo: string;
  intro?: string;
}) {
  return (
    <div className={styles.sectionHead}>
      <div className={styles.sectionMeta}>
        <span className={styles.sectionIndex}>{indice}</span>
        <span className={styles.microLabel}>{rotulo}</span>
      </div>
      <LineReveal as="h2" lines={[semViuva(titulo)]} />
      {intro ? (
        <AnimatedSection delay={0.1}>
          <p className={styles.sectionIntro}>{semViuva(intro)}</p>
        </AnimatedSection>
      ) : null}
    </div>
  );
}

export function RelatorioDetalhadoView({ data }: { data: Dados }) {
  const msg = `Olá, Everton! Li o relatório detalhado de ${data.empresa} e quero conversar.`;
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  const temProximos = data.proximos.length > 0;
  const temEntregaveis = Boolean(data.designSystem || data.prototipo);

  const indice = [
    { id: "forte", rotulo: data.forte.titulo },
    { id: "fraco", rotulo: data.fraco.titulo },
    { id: "proposta", rotulo: data.proposta.titulo },
    ...(temProximos ? [{ id: "proximos", rotulo: "Próximos passos" }] : []),
  ];

  return (
    <div className={styles.root}>
      <header className={styles.cover}>
        <div className={styles.wrap}>
          <div className={styles.topbar}>
            <Marca />
            <a className={styles.back} href={`/relatorio/${data.slug}`}>
              <span aria-hidden="true">←</span> Diagnóstico
            </a>
          </div>

          <span className={styles.microLabel}>Relatório detalhado</span>
          <LineReveal as="h1" className={styles.coverTitle} lines={[semViuva(data.empresa)]} />

          <p className={styles.metaLine}>
            <span className={styles.metaItem}>{data.cidade}</span>
            <span className={styles.metaItem}>
              <span className={styles.sep} aria-hidden="true">·</span>
              {dateFmt.format(new Date(data.geradoEm + "T12:00:00"))}
            </span>
            {data.site ? (
              <span className={`${styles.metaItem} ${styles.metaSite}`}>
                <span className={styles.sep} aria-hidden="true">·</span>
                <a href={data.site} target="_blank" rel="noopener noreferrer">
                  {dominio(data.site)}
                </a>
              </span>
            ) : null}
          </p>

          <AnimatedSection delay={0.15}>
            <p className={styles.resumo}>{semViuva(data.resumo)}</p>
          </AnimatedSection>

          <nav className={styles.toc} aria-label="Neste relatório">
            <span className={styles.tocLabel}>Neste relatório</span>
            <ol>
              {indice.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>
                    <span className={styles.tocNum}>{num(i)}</span>
                    <span>{semViuva(s.rotulo)}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </header>

      <main>
        {/* 01 · O que já é forte */}
        <section id="forte" className={styles.section}>
          <div className={styles.wrap}>
            <CabecalhoSecao
              indice="01"
              rotulo="O que já existe"
              titulo={data.forte.titulo}
              intro={data.forte.intro}
            />

            <ol className={styles.list}>
              {data.forte.itens.map((it, i) => (
                <li
                  key={it.titulo}
                  className={`${styles.item} ${it.imagem ? "" : styles.itemSemImagem}`}
                >
                  <AnimatedSection className={styles.itemText}>
                    <span className={styles.itemNum}>{num(i)}</span>
                    <h3>{semViuva(it.titulo)}</h3>
                    <p>{semViuva(it.texto)}</p>
                  </AnimatedSection>
                  {it.imagem ? (
                    <AnimatedSection className={styles.itemMedia} delay={0.1}>
                      <Recorte img={it.imagem} alt={`Trecho do site atual: ${it.titulo}`} />
                    </AnimatedSection>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 02 · O que não acompanha */}
        <section id="fraco" className={`${styles.section} ${styles.sectionSoft}`}>
          <div className={styles.wrap}>
            <CabecalhoSecao
              indice="02"
              rotulo="Onde o site perde"
              titulo={data.fraco.titulo}
              intro={data.fraco.intro}
            />

            <ol className={styles.list}>
              {data.fraco.itens.map((it, i) => (
                <li
                  key={it.titulo}
                  className={`${styles.item} ${styles.itemFraco} ${it.imagem ? "" : styles.itemSemImagem}`}
                >
                  {it.imagem ? (
                    <AnimatedSection className={styles.itemMedia}>
                      <Recorte
                        img={it.imagem}
                        alt={`Trecho do site atual: ${it.titulo}`}
                        legenda="Site atual"
                      />
                    </AnimatedSection>
                  ) : null}
                  <AnimatedSection className={styles.itemText} delay={0.1}>
                    <span className={styles.itemNum}>{num(i)}</span>
                    <h3>{semViuva(it.titulo)}</h3>
                    <p>{semViuva(it.texto)}</p>
                    {it.impacto ? (
                      <p className={styles.impacto}>
                        <span className={styles.impactoLabel}>Impacto</span>
                        <span>{semViuva(it.impacto)}</span>
                      </p>
                    ) : null}
                  </AnimatedSection>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 03 · O que propomos */}
        <section id="proposta" className={styles.section}>
          <div className={styles.wrap}>
            <CabecalhoSecao indice="03" rotulo="A direção" titulo={data.proposta.titulo} />
            <AnimatedSection>
              <p className={styles.propostaTexto}>{semViuva(data.proposta.texto)}</p>
            </AnimatedSection>
            {temEntregaveis ? (
              <AnimatedSection className={styles.propostaAcoes} delay={0.08}>
                {data.designSystem ? (
                  <a
                    className={styles.propostaLink}
                    href={data.designSystem}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver design system <span aria-hidden="true">→</span>
                  </a>
                ) : null}
                {data.prototipo ? (
                  <a
                    className={styles.propostaLink}
                    href={data.prototipo}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir protótipo <span aria-hidden="true">→</span>
                  </a>
                ) : null}
              </AnimatedSection>
            ) : null}
            {data.proposta.imagens.length > 0 ? (
              <div
                className={`${styles.propostaGrid} ${
                  data.proposta.imagens.length === 1 ? styles.propostaUnica : ""
                }`}
              >
                {data.proposta.imagens.map((img, i) => (
                  <AnimatedSection key={img.src} delay={i * 0.1}>
                    <Recorte img={img} alt={`Proposta de site novo, tela ${i + 1}`} />
                  </AnimatedSection>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {/* 04 · Próximos passos */}
        {temProximos ? (
          <section id="proximos" className={`${styles.section} ${styles.sectionSoft}`}>
            <div className={styles.wrap}>
              <CabecalhoSecao indice="04" rotulo="Como seguimos" titulo="Próximos passos" />
              <ol className={styles.steps}>
                {data.proximos.map((p, i) => (
                  <li key={p}>
                    <AnimatedSection className={styles.step} delay={i * 0.08}>
                      <span className={styles.stepNum}>{num(i)}</span>
                      <p>{semViuva(p)}</p>
                    </AnimatedSection>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : null}

        <section className={styles.cta}>
          <div className={styles.wrap}>
            <div className={styles.ctaCard}>
              <LineReveal
                as="h2"
                lines={[semViuva("O próximo passo é uma conversa")]}
              />
              <p>
                {semViuva(
                  "Uma conversa curta para alinhar a direção e tirar as dúvidas sobre o site novo.",
                )}
              </p>
              <a
                className={styles.btnWhatsapp}
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.15h-.01c-1.52 0-3.01-.41-4.3-1.18l-.31-.18-3.12.82.83-3.04-.2-.31a7.93 7.93 0 0 1-1.22-4.28c0-4.43 3.61-8.04 8.04-8.04 2.15 0 4.17.84 5.69 2.36a8 8 0 0 1 2.36 5.68c0 4.44-3.61 8.05-8.06 8.05Zm4.41-6.03c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
                </svg>
                Conversar no WhatsApp
              </a>
              <p className={styles.ctaNote}>Resposta rápida, sem compromisso.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.siteFooter}>
        <div className={styles.wrap}>
          <Marca />
          <p>{semViuva(`Relatório detalhado de presença digital · ${data.empresa}`)}</p>
        </div>
      </footer>
    </div>
  );
}
