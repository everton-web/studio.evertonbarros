// Dashboard público do cliente (/r/<token>). Componente de servidor, sem login.
// Cada número cita a fonte e a data; sem dado, estado vazio honesto (nunca zero fabricado).
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import type { ConteudoRelatorio } from "@/lib/data/relatorios";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// "2026-09-25 00:39:25" ou ISO -> "25 de setembro"
function dataCurta(v: string | null): string {
  if (!v) return "";
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]}`;
}

function Bloco({ titulo, fonte, children }: { titulo: string; fonte?: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6 min-w-0">
      <h2 className="mono mb-4">{titulo}</h2>
      {children}
      {fonte && <p className="text-[.75rem] text-[var(--muted)] mt-4 leading-relaxed text-pretty">{fonte}</p>}
    </section>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return <p className="text-[.85rem] text-[var(--muted)] leading-relaxed text-pretty">{children}</p>;
}

function Linha({ rotulo, valor, tom }: { rotulo: string; valor: string; tom?: "ok" | "alerta" | "neutro" }) {
  const cor = tom === "ok" ? "var(--success)" : tom === "alerta" ? "var(--danger)" : "var(--muted)";
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--line)] last:border-0">
      <span className="text-[.86rem] text-[var(--ink-2)]">{rotulo}</span>
      <span className="text-[.86rem] font-medium text-right" style={{ color: cor }}>
        {valor}
      </span>
    </div>
  );
}

export function RelatorioCliente({ r }: { r: ConteudoRelatorio }) {
  const s = r.saude;
  const geradoEm = dataCurta(r.geradoEm);

  const noAr =
    s.noAr === null ? { v: "sem medida ainda", t: "neutro" as const } : s.noAr ? { v: "no ar", t: "ok" as const } : { v: "fora do ar", t: "alerta" as const };
  const form =
    s.formulario === "ok"
      ? { v: "funcionando", t: "ok" as const }
      : s.formulario === "falha"
        ? { v: "com falha", t: "alerta" as const }
        : { v: "sem medida ainda", t: "neutro" as const };
  const cert =
    s.certificadoDias === null
      ? { v: "sem medida ainda", t: "neutro" as const }
      : s.certificadoDias <= 14
        ? { v: `vence em ${s.certificadoDias} dias`, t: "alerta" as const }
        : { v: `válido por mais ${s.certificadoDias} dias`, t: "ok" as const };

  return (
    <main className="min-h-screen px-4 sm:px-6 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-[880px]">
        <header className="mb-8 sm:mb-10">
          <p className="mono">Marca Digital</p>
          <h1 className="mt-3 text-[clamp(1.5rem,5vw,2.1rem)] font-semibold tracking-[-.025em] leading-tight text-balance">
            {r.empresa.nome}
          </h1>
          <p className="mt-2 text-[.95rem] text-[var(--ink-2)] text-balance">Relatório de {r.mesRotulo}</p>
        </header>

        {s.alerta && (
          <div className="mb-5 rounded-2xl border border-[var(--danger)]/35 bg-[var(--danger)]/8 px-5 py-4 text-[.88rem] text-[var(--ink)] leading-relaxed">
            Encontramos um ponto de atenção no site. Já estamos de olho e vamos resolver com você.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Bloco
            titulo="Visitas ao site"
            fonte={
              r.pixel.paginas !== null
                ? `Fonte: ${r.pixel.fonte}${r.pixel.ultimo ? `. Último registro em ${dataCurta(r.pixel.ultimo)}` : ""}.`
                : `Fonte: ${r.pixel.fonte}. Consultado em ${geradoEm}.`
            }
          >
            {r.pixel.paginas !== null ? (
              <div>
                <div className="nums text-[clamp(2rem,8vw,2.8rem)] leading-none font-semibold">
                  {r.pixel.paginas.toLocaleString("pt-BR")}
                </div>
                <p className="text-[.85rem] text-[var(--ink-2)] mt-2">{r.pixel.paginas === 1 ? "página vista" : "páginas vistas"}</p>
              </div>
            ) : (
              <Vazio>Nenhuma visita registrada ainda. O contador começa quando o site com o pixel receber a primeira visita.</Vazio>
            )}
          </Bloco>

          <Bloco
            titulo="Saúde do site"
            fonte={s.verificadoEm ? `Fonte: verificação automática. Última em ${dataCurta(s.verificadoEm)}.` : `Fonte: verificação automática. Ainda sem medida.`}
          >
            <div>
              <Linha rotulo="Site" valor={noAr.v} tom={noAr.t} />
              <Linha rotulo="Formulário de contato" valor={form.v} tom={form.t} />
              <Linha rotulo="Certificado de segurança" valor={cert.v} tom={cert.t} />
            </div>
          </Bloco>

          <Bloco titulo="Contatos do formulário" fonte={`Fonte: ${r.leads.fonte}. Consultado em ${geradoEm}.`}>
            {r.leads.total > 0 ? (
              <div>
                <div className="nums text-[clamp(2rem,8vw,2.8rem)] leading-none font-semibold">{r.leads.total.toLocaleString("pt-BR")}</div>
                <p className="text-[.85rem] text-[var(--ink-2)] mt-2">{r.leads.total === 1 ? "pessoa entrou em contato" : "pessoas entraram em contato"}</p>
              </div>
            ) : (
              <Vazio>Nenhum lead do formulário ainda.</Vazio>
            )}
          </Bloco>

          <Bloco titulo="Comportamento no site">
            <Vazio>Números do Clarity: pendente de API. Enquanto isso, o painel completo abre em outra aba.</Vazio>
            <a
              href={r.clarity.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-[var(--line-2)] text-[.85rem] font-medium text-[var(--ink)] hover:border-[var(--accent)] transition-colors"
            >
              Abrir painel do Clarity
              <ExternalLink className="w-4 h-4" strokeWidth={2} />
            </a>
          </Bloco>

          <div className="md:col-span-2">
            <Bloco titulo="Google Search Console">
              {r.searchConsole.autorizado ? (
                <Vazio>Acesso autorizado. Os números de busca aparecem aqui assim que a conexão for concluída.</Vazio>
              ) : (
                <Vazio>Sem autorização registrada para o Search Console. Nenhum dado de busca é exibido.</Vazio>
              )}
            </Bloco>
          </div>
        </div>

        <footer className="mt-8 text-[.75rem] text-[var(--muted)] leading-relaxed text-pretty">
          Relatório gerado em {geradoEm}. Dúvidas? Responda a mensagem que trouxe este link.
        </footer>
      </div>
    </main>
  );
}
