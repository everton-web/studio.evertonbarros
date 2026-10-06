"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, RotateCcw, AlertTriangle, ShieldAlert, MessageCircle } from "lucide-react";
import { AGENTES, CORES } from "./demandas";

type Demanda = {
  id: string;
  titulo: string;
  persona: string;
  status: string;
  prazo: string;
  cliente: string;
  log: string[];
  briefing?: string;
};
type Reuniao = { id: string; titulo: string; quando: string; duracao: number; participante: string; criada_em: string };
type Saude = {
  slug: string;
  cliente: string;
  no_ar: boolean | null;
  certificado_dias: number | null;
  formulario: string | null;
  verificado_em: string;
};

type ItemRelatorio = {
  empresaId: string;
  nome: string;
  gerado: boolean;
  enviado: boolean;
  semWhatsapp: boolean;
  wa: string | null;
  link: string | null;
};
type ListaRelatorios = { mes: string; mesRotulo: string; itens: ItemRelatorio[] };

const ease = [0.22, 1, 0.36, 1] as const;

const nomeAgente = (id: string) => AGENTES.find((a) => a.id === id)?.nome || id || "orion";
const corAgente = (id: string) => CORES[id] || "#8a8a85";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function diaDe(q: string) {
  return (q || "").slice(0, 10);
}
function fmtCurto(q: string) {
  const s = diaDe(q);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}`;
}
function fmtHora(q: string) {
  const t = (q || "").match(/T(\d{2}):(\d{2})/);
  return t ? `${t[1]}:${t[2]}` : "";
}
function fmtChecado(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtMoeda(v: number) {
  return "R$ " + Math.round(v).toLocaleString("pt-BR");
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="mono mb-3">{titulo}</h2>
      {children}
    </section>
  );
}

// Linha do log ("<ISO> <quem> <estado> <nota>") vira texto legível: "nota · há 2h".
function motivoLegivel(linha: string): string {
  const m = linha.replace(/^-\s*/, "").match(/^(\S+)\s+\S+\s+\S+\s*(.*)$/);
  if (!m) return linha;
  const quando = new Date(m[1]).getTime();
  const nota = (m[2] || "").trim();
  if (!quando) return nota || linha;
  const min = Math.max(0, Math.round((Date.now() - quando) / 60000));
  const ha = min < 60 ? `há ${min} min` : min < 1440 ? `há ${Math.round(min / 60)}h` : `há ${Math.round(min / 1440)} dias`;
  return nota ? `${nota} · ${ha}` : ha;
}

export function Hoje({ placar }: { placar: { progresso: number; acumulado: number; meta: number; fase: string } }) {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [saude, setSaude] = useState<Saude[]>([]);
  const [relatorios, setRelatorios] = useState<ListaRelatorios | null>(null);
  const [gerando, setGerando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [ro, ra, rs, rr] = await Promise.all([
        fetch("/api/orquestra"),
        fetch("/api/agenda"),
        fetch("/api/saude"),
        fetch("/api/relatorio-mensal"),
      ]);
      if ([ro, ra, rs, rr].some((r) => r.status === 401)) {
        location.href = "/login";
        return;
      }
      const [jo, ja, js, jr] = await Promise.all([ro.json(), ra.json(), rs.json(), rr.json().catch(() => null)]);
      setRelatorios(jr && Array.isArray(jr.itens) ? jr : null);
      setDemandas(Array.isArray(jo.fila) ? jo.fila : []);
      setReunioes(Array.isArray(ja.reunioes) ? ja.reunioes : []);
      setSaude(Array.isArray(js.alertas) ? js.alertas : []);
    } catch {
      /* offline */
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const dataExtenso = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const hoje = ymd(new Date());
  const aguardando = demandas.filter((d) => d.status === "aguardando_everton");
  const emAndamento = demandas.filter((d) => d.status === "em_andamento");
  const reunioesHoje = reunioes.filter((r) => diaDe(r.quando) === hoje);
  const demandasHoje = demandas.filter((d) => d.prazo && diaDe(d.prazo) === hoje);
  const alertas = saude.filter(
    (s) =>
      s.no_ar === false ||
      (s.certificado_dias != null && s.certificado_dias <= 14) ||
      s.formulario === "falha",
  );

  function agendaDoDia() {
    type Item = { id: string; titulo: string; hora: string; tipo: "reuniao" | "tarefa"; detalhe: string };
    const itens: Item[] = [
      ...reunioesHoje.map((r) => ({
        id: r.id,
        titulo: r.titulo,
        hora: fmtHora(r.quando),
        tipo: "reuniao" as const,
        detalhe: r.participante ? `reunião com ${r.participante}` : "reunião",
      })),
      ...demandasHoje.map((d) => ({
        id: d.id,
        titulo: d.titulo,
        hora: fmtHora(d.prazo),
        tipo: "tarefa" as const,
        detalhe: `tarefa de ${nomeAgente(d.persona)}`,
      })),
    ];
    return itens.sort((a, b) => a.hora.localeCompare(b.hora));
  }

  async function decidir(id: string, action: "aprovar" | "devolver") {
    setBusyId(id + action);
    try {
      await fetch("/api/orquestra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      await load();
    } catch {
      /* offline */
    } finally {
      setBusyId(null);
    }
  }

  async function gerarRelatorios() {
    setGerando(true);
    try {
      await fetch("/api/relatorio-mensal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "gerar" }),
      });
      await load();
    } catch {
      /* offline */
    } finally {
      setGerando(false);
    }
  }

  // O toque abre o WhatsApp (o navegador segue o link) e só então marca como enviado.
  function marcarEnviado(empresaId: string) {
    fetch("/api/relatorio-mensal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enviado", empresaId }),
    })
      .then(() => load())
      .catch(() => {});
  }

  const itensDia = agendaDoDia();
  const pendentesRel = relatorios ? relatorios.itens.filter((i) => !i.gerado).length : 0;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
        <h2 className="text-[clamp(1.3rem,3vw,1.6rem)] font-semibold tracking-[-.025em] leading-tight text-balance">
          {saudacao}, Everton
        </h2>
        <p className="text-[.85rem] text-[var(--muted)] mt-1.5">{dataExtenso}</p>
      </motion.div>

      {carregando ? (
        <div className="text-[.85rem] text-[#8a8a85]">carregando o dia…</div>
      ) : (
        <>
          {/* a) aprovações pendentes */}
          <Bloco titulo="Aprovações pendentes">
            {aguardando.length === 0 ? (
              <div className="text-[.82rem] text-[#6b6b66]">Nada para aprovar agora.</div>
            ) : (
              <div className="space-y-3">
                {aguardando.map((d) => {
                  const motivo = motivoLegivel(d.log.length > 0 ? d.log[d.log.length - 1] : "");
                  return (
                    <div key={d.id} className="rounded-xl border border-[var(--line)] bg-[var(--bg-1)] p-3.5">
                      <div className="flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "#FF4000" }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[.9rem] font-medium leading-snug text-balance">{d.titulo}</div>
                          <div className="mono mt-1" style={{ fontSize: "0.64rem" }}>
                            <span style={{ color: corAgente(d.persona) }}>{nomeAgente(d.persona)}</span>
                            {d.prazo ? ` · prazo ${fmtCurto(d.prazo)}` : ""}
                          </div>
                          {motivo && (
                            <p className="text-[.76rem] text-[#9a9a95] mt-1.5 leading-relaxed line-clamp-2">{motivo}</p>
                          )}
                          {d.briefing && (
                            <a href={`/api/briefing?path=${encodeURIComponent(d.briefing)}`} target="_blank" rel="noopener noreferrer" className="inline-block mt-1.5 text-[.76rem] text-[var(--accent)] hover:underline">abrir material ↗</a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2.5 mt-3">
                        <button
                          onClick={() => decidir(d.id, "aprovar")}
                          disabled={busyId === d.id + "aprovar"}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#FF4000] hover:bg-[#ff5c22] disabled:opacity-60 text-[var(--accent-ink)] text-[.84rem] font-semibold transition-colors"
                        >
                          <Check className="w-4 h-4" strokeWidth={2.2} />
                          aprovar
                        </button>
                        <button
                          onClick={() => decidir(d.id, "devolver")}
                          disabled={busyId === d.id + "devolver"}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-[var(--line-2)] text-[#c4c4c0] hover:text-white disabled:opacity-60 text-[.84rem] font-medium transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" strokeWidth={2} />
                          devolver
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Bloco>

          {/* b) agenda do dia */}
          <Bloco titulo="Agenda do dia">
            {itensDia.length === 0 && emAndamento.length === 0 && aguardando.length === 0 ? (
              <div className="text-[.82rem] text-[#6b6b66] leading-relaxed text-balance">
                Nada agendado para hoje. As demandas aparecem aqui quando o Orion registra uma tarefa ou reunião.
              </div>
            ) : (
              <div className="space-y-4">
                {itensDia.length > 0 && (
                  <div className="space-y-2">
                    {itensDia.map((it) => (
                      <div key={`${it.tipo}-${it.id}`} className="flex items-start gap-3 py-2 border-b border-[var(--line)] last:border-0">
                        <span className="w-14 shrink-0 nums text-[.78rem] text-[var(--ink-2)] pt-0.5">{it.hora || "dia"}</span>
                        <span
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{ background: it.tipo === "reuniao" ? "#FF4000" : "#7aa2ff" }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[.86rem] leading-snug truncate">{it.titulo}</div>
                          <div className="mono mt-0.5" style={{ fontSize: "0.62rem" }}>{it.detalhe}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {emAndamento.length > 0 && (
                  <div>
                    <div className="mono mb-2" style={{ fontSize: "0.62rem" }}>Em andamento</div>
                    <div className="space-y-1.5">
                      {emAndamento.map((d) => (
                        <div key={d.id} className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#54b8f0" }} />
                          <div className="min-w-0 flex-1 text-[.84rem] leading-snug truncate">{d.titulo}</div>
                          <span className="mono shrink-0" style={{ fontSize: "0.62rem", color: corAgente(d.persona) }}>
                            {nomeAgente(d.persona)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aguardando.length > 0 && (
                  <div>
                    <div className="mono mb-2" style={{ fontSize: "0.62rem" }}>Esperando você</div>
                    <div className="space-y-1.5">
                      {aguardando.map((d) => (
                        <div key={d.id} className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#FF4000" }} />
                          <div className="min-w-0 flex-1 text-[.84rem] leading-snug truncate">{d.titulo}</div>
                          <span className="mono shrink-0" style={{ fontSize: "0.62rem", color: corAgente(d.persona) }}>
                            {nomeAgente(d.persona)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Bloco>

          {/* c) alertas de cliente */}
          <Bloco titulo="Alertas de cliente">
            {alertas.length === 0 ? (
              <div className="text-[.82rem] text-[#6b6b66] leading-relaxed text-balance">
                Sem alerta de cliente. Nenhum site verificado ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {alertas.map((s) => {
                  const linhas: { texto: string; valor: string }[] = [];
                  if (s.no_ar === false) linhas.push({ texto: "site fora do ar", valor: "offline" });
                  if (s.certificado_dias != null && s.certificado_dias <= 14) {
                    linhas.push({ texto: "certificado a vencer", valor: `${s.certificado_dias} dias` });
                  }
                  if (s.formulario === "falha") linhas.push({ texto: "formulário com falha", valor: "falha" });
                  return (
                    <div key={s.slug} className="rounded-xl border border-[#fb7185]/30 bg-[#fb7185]/6 p-3.5">
                      <div className="flex items-center gap-2">
                        {s.no_ar === false ? (
                          <ShieldAlert className="w-4 h-4 text-[#fb7185] shrink-0" strokeWidth={1.9} />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-[#d9a03a] shrink-0" strokeWidth={1.9} />
                        )}
                        <span className="text-[.88rem] font-medium truncate">{s.cliente}</span>
                        {s.verificado_em && (
                          <span className="mono ml-auto shrink-0" style={{ fontSize: "0.6rem" }}>
                            {fmtChecado(s.verificado_em)}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        {linhas.map((l) => (
                          <div key={l.texto} className="flex items-center gap-2 text-[.78rem] text-[#c4c4c0]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#fb7185] shrink-0" />
                            <span>{l.texto}:</span>
                            <span className="nums text-[var(--ink)]">{l.valor}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Bloco>

          {/* c2) relatórios mensais dos clientes */}
          {relatorios && (
            <Bloco titulo="Relatórios dos clientes">
              {relatorios.itens.length === 0 ? (
                <div className="text-[.82rem] text-[#6b6b66] leading-relaxed text-balance">
                  Nenhum cliente ativo para enviar relatório.
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[.8rem] text-[var(--muted)] leading-relaxed">
                    Relatório de {relatorios.mesRotulo}. Um toque abre o WhatsApp com a mensagem e o link prontos.
                  </p>
                  {relatorios.itens.map((it) => (
                    <div
                      key={it.empresaId}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg-1)] p-3.5"
                    >
                      <div className="min-w-0 flex-1 basis-40">
                        <div className="text-[.9rem] font-medium leading-snug">{it.nome}</div>
                        <div className="text-[.76rem] text-[#9a9a95] mt-1">
                          {!it.gerado ? "relatório ainda não gerado" : it.enviado ? "enviado" : "pronto para enviar"}
                          {it.gerado && it.link && (
                            <>
                              {" · "}
                              <a href={it.link} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                                ver relatório ↗
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                      {it.gerado && it.wa && (
                        <a
                          href={it.wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => marcarEnviado(it.empresaId)}
                          className="flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#FF4000] hover:bg-[#ff5c22] text-[var(--accent-ink)] text-[.84rem] font-semibold transition-colors w-full sm:w-auto"
                        >
                          <MessageCircle className="w-4 h-4" strokeWidth={2.2} />
                          {it.enviado ? "mandar de novo" : "mandar no WhatsApp"}
                        </a>
                      )}
                      {it.gerado && !it.wa && (
                        <span className="text-[.78rem] text-[#9a9a95]">sem WhatsApp cadastrado</span>
                      )}
                    </div>
                  ))}
                  {pendentesRel > 0 && (
                    <button
                      onClick={gerarRelatorios}
                      disabled={gerando}
                      className="flex items-center justify-center h-11 px-5 rounded-xl border border-[var(--line-2)] text-[#c4c4c0] hover:text-white disabled:opacity-60 text-[.84rem] font-medium transition-colors w-full sm:w-auto"
                    >
                      {gerando ? "gerando…" : `gerar relatório de ${relatorios.mesRotulo}`}
                    </button>
                  )}
                </div>
              )}
            </Bloco>
          )}

          {/* d) placar */}
          <Bloco titulo="Placar">
            {placar.acumulado === 0 ? (
              <div className="text-[.85rem] text-[#6b6b66]">R$ 0, sem faturamento no mês</div>
            ) : (
              <div>
                <div className="nums text-[clamp(1.6rem,4vw,2.2rem)] leading-none font-semibold text-[#3ddc84]">
                  {fmtMoeda(placar.acumulado)}
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex-1 h-[4px] rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full bg-[#3ddc84]" style={{ width: `${Math.min(100, placar.progresso)}%` }} />
                  </div>
                  <span className="mono shrink-0" style={{ fontSize: "0.66rem" }}>
                    {placar.progresso}%
                  </span>
                </div>
                <p className="mono mt-3" style={{ fontSize: "0.66rem" }}>
                  fase atual · {placar.fase || "-"}
                </p>
              </div>
            )}
          </Bloco>
        </>
      )}
    </div>
  );
}
