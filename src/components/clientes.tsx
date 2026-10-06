"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { brl, dataCurta, dataLonga, hostDoSite, relativo } from "@/lib/formato";
import type { CardCliente, DetalheCliente } from "@/lib/data/clientes";

type Resumo = { ativos: number; novosNoMes: number };

const campoCls =
  "w-full bg-white/3 border border-[var(--line)] rounded-xl px-4 h-[48px] text-[.9rem] text-[#f7f7f5] outline-none focus:border-[#FF4000]/70 transition-colors placeholder:text-[#5d5d58]";
const btnCls =
  "inline-flex items-center justify-center h-[44px] px-5 rounded-xl text-[.82rem] font-semibold transition-colors disabled:opacity-50";
const btnPrimario = btnCls + " bg-[#FF4000] hover:bg-[#ff5c22] text-[var(--accent-ink)]";
const btnSecundario = btnCls + " border border-[var(--line-2)] text-[var(--ink-2)] hover:text-white hover:border-white/40";

async function api(body: Record<string, unknown>) {
  const r = await fetch("/api/clientes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (r.status === 401) {
    location.href = "/login";
  }
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok && j.ok !== false, ...j } as { ok: boolean; error?: string; [k: string]: unknown };
}

function Chip({ children, tom }: { children: React.ReactNode; tom?: "ok" | "aviso" | "erro" }) {
  const cor = tom === "ok" ? "#3ddc84" : tom === "aviso" ? "#e0a83c" : tom === "erro" ? "#fb6a6a" : "";
  return (
    <span className="chip shrink-0" style={cor ? { color: cor, borderColor: cor + "55", background: cor + "14" } : undefined}>
      {children}
    </span>
  );
}

function Bloco({ titulo, children, extra }: { titulo: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--bg-1)] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="mono text-balance" style={{ fontSize: "0.72rem" }}>{titulo}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
}

const Vazio = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[.84rem] text-[#8a8a85] text-balance">{children}</p>
);

// ---------- saúde do site ----------
function Saude({ d }: { d: DetalheCliente }) {
  const s = d.saude;
  if (!s) return <Vazio>Site ainda não verificado.</Vazio>;
  const sem = "sem medida ainda";
  const itens: { rotulo: string; valor: string; tom?: "ok" | "erro" | "aviso" }[] = [
    { rotulo: "No ar", valor: s.no_ar === null ? sem : s.no_ar ? "Sim" : "Fora do ar", tom: s.no_ar === null ? undefined : s.no_ar ? "ok" : "erro" },
    { rotulo: "Formulário", valor: s.formulario === null ? sem : s.formulario === "ok" ? "Funcionando" : "Com falha", tom: s.formulario === null ? undefined : s.formulario === "ok" ? "ok" : "erro" },
    {
      rotulo: "Certificado",
      valor: s.certificado_dias === null ? sem : s.certificado_dias <= 0 ? "Vencido" : `${s.certificado_dias} dias`,
      tom: s.certificado_dias === null ? undefined : s.certificado_dias <= 15 ? "erro" : "ok",
    },
    {
      rotulo: "Velocidade",
      valor: s.velocidade_ms === null ? sem : (s.velocidade_ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " s",
      tom: s.velocidade_ms === null ? undefined : s.velocidade_ms > 3000 ? "aviso" : "ok",
    },
  ];
  const cor = { ok: "#3ddc84", erro: "#fb6a6a", aviso: "#e0a83c" } as const;
  const msg = (a: { tipo: string; dias?: number }) =>
    a.tipo === "fora_do_ar"
      ? "O site está fora do ar."
      : a.tipo === "formulario"
        ? "O formulário de contato falhou na última verificação."
        : (a.dias ?? 0) <= 0
          ? "O certificado venceu."
          : `O certificado vence em ${a.dias} dias.`;
  return (
    <div>
      {s.alertas.length > 0 && (
        <div role="alert" className="mb-3 rounded-xl border border-[#fb6a6a]/35 bg-[#fb6a6a]/8 px-4 py-3 text-[.84rem] text-[#fb9a9a]">
          {s.alertas.map((a, i) => (
            <div key={i}>{msg(a)}</div>
          ))}
          {s.verificado_em && <div className="mt-1 text-[.76rem] text-[#8a8a85]">Verificado {relativo(s.verificado_em)}</div>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {itens.map((i) => (
          <div key={i.rotulo} className="rounded-xl border border-[var(--line)] bg-white/3 px-3 py-3">
            <div className="mono" style={{ fontSize: "0.66rem" }}>{i.rotulo}</div>
            <div className="mt-1 text-[.9rem] font-medium" style={{ color: i.tom ? cor[i.tom] : "#8a8a85" }}>{i.valor}</div>
          </div>
        ))}
      </div>
      {s.alertas.length === 0 && s.verificado_em && <p className="mt-2 text-[.76rem] text-[#8a8a85]">Verificado {relativo(s.verificado_em)}</p>}
    </div>
  );
}

// ---------- cofre ----------
function Cofre({ d, recarregar }: { d: DetalheCliente; recarregar: () => Promise<void> }) {
  const [vis, setVis] = useState<Record<string, { usuario: string | null; senha: string }>>({});
  const [novo, setNovo] = useState(false);
  const [f, setF] = useState({ label: "", url: "", usuario: "", senha: "" });
  const [msg, setMsg] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach(clearTimeout);
  }, []);

  function esconder(id: string) {
    setVis((v) => {
      const n = { ...v };
      delete n[id];
      return n;
    });
  }
  async function mostrar(id: string) {
    setMsg("");
    const r = await api({ action: "revelar", id: d.id, credencial: id });
    if (!r.ok) return setMsg(String(r.error || "Não foi possível mostrar a senha."));
    setVis((v) => ({ ...v, [id]: { usuario: (r.usuario as string) ?? null, senha: String(r.senha) } }));
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => esconder(id), 30000); // some sozinha em 30 s
  }
  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await api({ action: "credencial", id: d.id, ...f });
    if (!r.ok) return setMsg(String(r.error || "Não foi possível guardar."));
    setF({ label: "", url: "", usuario: "", senha: "" });
    setNovo(false);
    await recarregar();
  }
  async function remover(id: string) {
    esconder(id);
    await api({ action: "remover-credencial", id: d.id, credencial: id });
    await recarregar();
  }

  return (
    <Bloco
      titulo="Cofre de senhas"
      extra={d.cofreAtivo && <button onClick={() => setNovo(!novo)} className="text-[.78rem] text-[#7aa2ff] h-10 px-2">{novo ? "cancelar" : "+ guardar acesso"}</button>}
    >
      {!d.cofreAtivo && <Vazio>Cofre indisponível: a chave de cifra ainda não foi configurada no servidor.</Vazio>}
      {d.cofreAtivo && novo && (
        <form onSubmit={guardar} className="grid gap-2 mb-4">
          <input className={campoCls} placeholder="Nome do acesso (ex.: WordPress Admin)" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} aria-label="Nome do acesso" />
          <input className={campoCls} placeholder="Endereço (opcional)" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} aria-label="Endereço" />
          <input className={campoCls} placeholder="Usuário" autoComplete="off" value={f.usuario} onChange={(e) => setF({ ...f, usuario: e.target.value })} aria-label="Usuário" />
          <input className={campoCls} placeholder="Senha" type="password" autoComplete="new-password" value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} aria-label="Senha" />
          <button className={btnPrimario} type="submit" disabled={!f.label || !f.senha}>guardar no cofre</button>
        </form>
      )}
      {d.cofreAtivo && d.credenciais.length === 0 && !novo && <Vazio>Sem credenciais cadastradas</Vazio>}
      <ul className="grid gap-2">
        {d.credenciais.map((c) => {
          const v = vis[c.id];
          return (
            <li key={c.id} className="rounded-xl border border-[var(--line)] bg-white/3 px-3 py-3" data-credencial={c.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[.88rem] font-medium truncate">{c.label}</div>
                  {c.usuario && <div className="text-[.76rem] text-[#8a8a85] truncate">Usuário: {c.usuario}</div>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => (v ? esconder(c.id) : mostrar(c.id))}
                    className="h-11 px-3 rounded-lg border border-[var(--line-2)] text-[.78rem] text-[var(--ink-2)] hover:text-white"
                  >
                    {v ? "esconder" : "mostrar"}
                  </button>
                  <button onClick={() => remover(c.id)} className="h-11 px-3 rounded-lg text-[.78rem] text-[#fb6a6a]">remover</button>
                </div>
              </div>
              {v && (
                <div data-senha className="mt-2 rounded-lg bg-black/40 px-3 py-2 font-mono text-[.84rem] break-all select-all">{v.senha}</div>
              )}
            </li>
          );
        })}
      </ul>
      {msg && <p role="alert" className="mt-2 text-[.8rem] text-[#fb6a6a]">{msg}</p>}
    </Bloco>
  );
}

// ---------- briefing ----------
function Briefing({ d, recarregar }: { d: DetalheCliente; recarregar: () => Promise<void> }) {
  const [copiado, setCopiado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const b = d.briefing;
  const link = b?.token ? `${typeof location !== "undefined" ? location.origin : ""}/b/${b.token}` : "";
  return (
    <Bloco titulo="Briefing" extra={b && <Chip tom={b.status === "respondido" ? "ok" : "aviso"}>{b.status === "respondido" ? "respondido" : "aguardando resposta"}</Chip>}>
      {!b && (
        <div className="grid gap-3">
          <Vazio>Nenhum briefing ainda.</Vazio>
          <button className={btnSecundario} onClick={async () => { await api({ action: "briefing", id: d.id }); await recarregar(); }}>gerar link do briefing</button>
        </div>
      )}
      {b && (
        <div className="grid gap-3">
          {b.status === "aguardando" && b.token && (
            <>
              <div data-briefing-link className="rounded-xl bg-black/40 px-3 py-2 text-[.78rem] break-all text-[#b8b8b3]">{link}</div>
              <button
                className={btnSecundario}
                onClick={async () => { try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 1500); } catch {} }}
              >
                {copiado ? "link copiado" : "copiar link"}
              </button>
            </>
          )}
          {b.status === "aguardando" && !b.token && (
            <button className={btnSecundario} onClick={async () => { await api({ action: "briefing", id: d.id }); await recarregar(); }}>rotacionar link legado</button>
          )}
          {b.status === "respondido" && (
            <>
              <p className="text-[.84rem] text-[#b8b8b3]">Respondido {relativo(b.respondidoEm)}.</p>
              <button className={btnSecundario} onClick={() => setAberto(!aberto)}>{aberto ? "esconder respostas" : "ver respostas"}</button>
              {aberto && (
                <div className="grid gap-3">
                  {b.respostas.map((r) => (
                    <div key={r.pergunta}>
                      <div className="mono" style={{ fontSize: "0.66rem" }}>{r.pergunta}</div>
                      <p className="mt-1 text-[.86rem] whitespace-pre-wrap">{r.resposta}</p>
                    </div>
                  ))}
                </div>
              )}
              <button className={btnSecundario} onClick={async () => { await api({ action: "briefing", id: d.id }); await recarregar(); }}>gerar novo link</button>
            </>
          )}
        </div>
      )}
    </Bloco>
  );
}

// ---------- contrato ----------
function Contrato({ d, recarregar }: { d: DetalheCliente; recarregar: () => Promise<void> }) {
  const [novo, setNovo] = useState(false);
  const [f, setF] = useState({ tipo_pagamento: "pix", parcelas: "", inicio: "" });
  const [texto, setTexto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rotulo: Record<string, string> = { pix: "à vista por Pix", cartao: "no cartão", parcelado: "parcelado" };

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await api({ action: "contrato", id: d.id, ...f, valor: d.valorProjeto ?? undefined });
    setBusy(false);
    setNovo(false);
    await recarregar();
  }
  async function ver(id: string) {
    const r = await fetch(`/api/clientes?id=${encodeURIComponent(d.id)}&contrato=${encodeURIComponent(id)}`);
    const j = await r.json().catch(() => ({}));
    setTexto(j.texto ?? "Não foi possível abrir o contrato.");
  }
  return (
    <Bloco titulo="Contrato rápido" extra={<button onClick={() => setNovo(!novo)} className="text-[.78rem] text-[#7aa2ff] h-10 px-2">{novo ? "cancelar" : "+ gerar contrato"}</button>}>
      {novo && (
        <form onSubmit={gerar} className="grid gap-2 mb-4">
          <select className={campoCls} value={f.tipo_pagamento} onChange={(e) => setF({ ...f, tipo_pagamento: e.target.value })} aria-label="Forma de pagamento">
            <option value="pix">À vista por Pix</option>
            <option value="cartao">No cartão</option>
            <option value="parcelado">Parcelado</option>
          </select>
          {f.tipo_pagamento === "parcelado" && (
            <input className={campoCls} inputMode="numeric" placeholder="Número de parcelas" value={f.parcelas} onChange={(e) => setF({ ...f, parcelas: e.target.value })} aria-label="Parcelas" />
          )}
          <input className={campoCls} type="date" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} aria-label="Início do projeto" />
          <p className="text-[.76rem] text-[#8a8a85]">O valor vem do cadastro do cliente. O contrato sai como rascunho para revisar antes de enviar.</p>
          <button className={btnPrimario} type="submit" disabled={busy}>{busy ? "gerando…" : "gerar contrato"}</button>
        </form>
      )}
      {d.contratos.length === 0 && !novo && <Vazio>Nenhum contrato ainda.</Vazio>}
      <ul className="grid gap-2">
        {d.contratos.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-white/3 px-3 py-3">
            <div className="min-w-0 text-[.84rem]">
              <div className="font-medium">{c.valor ? brl(c.valor) : "Valor a definir"} · {rotulo[c.tipoPagamento || "pix"] || "à vista"}</div>
              <div className="text-[.76rem] text-[#8a8a85]">Gerado {relativo(c.criadoEm)}</div>
            </div>
            <button onClick={() => ver(c.id)} className="h-11 px-3 rounded-lg border border-[var(--line-2)] text-[.78rem] text-[var(--ink-2)] hover:text-white shrink-0">ver contrato</button>
          </li>
        ))}
      </ul>
      {texto !== null && (
        <div className="mt-3 rounded-xl border border-[var(--line)] bg-black/40 p-3">
          <pre className="whitespace-pre-wrap break-words text-[.78rem] text-[#c4c4c0] max-h-[320px] overflow-y-auto font-sans">{texto}</pre>
          <button className={btnSecundario + " mt-2"} onClick={() => setTexto(null)}>fechar</button>
        </div>
      )}
    </Bloco>
  );
}

// ---------- gaveta ----------
function Gaveta({ id, onClose, onMudou }: { id: string; onClose: () => void; onMudou: () => void }) {
  const [d, setD] = useState<DetalheCliente | null>(null);
  const [erro, setErro] = useState(false);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ valor_projeto: "", recorrencia: "", site: "" });

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/clientes?id=${encodeURIComponent(id)}`);
      if (r.status === 401) { location.href = "/login"; return; }
      if (!r.ok) throw new Error();
      setD((await r.json()).cliente);
      setErro(false);
    } catch {
      setErro(true);
    }
  }, [id]);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const recarregar = async () => { await carregar(); onMudou(); };

  async function salvarDados(e: React.FormEvent) {
    e.preventDefault();
    await api({ action: "editar", id, ...f });
    setEdit(false);
    await recarregar();
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Cliente">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <aside className="absolute right-0 top-0 h-full w-full sm:max-w-[560px] bg-[var(--bg-2)] border-l border-[var(--line)] overflow-y-auto overflow-x-hidden" data-gaveta>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-4 sm:px-6 py-4 bg-[var(--bg-2)] border-b border-[var(--line)]">
          <div className="min-w-0">
            <h2 className="text-[1.15rem] font-semibold tracking-[-.02em] text-balance">{d?.nome ?? "Carregando…"}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Chip>cliente</Chip>
              {d?.site && (
                <a href={/^https?:/i.test(d.site) ? d.site : `https://${d.site}`} target="_blank" rel="noopener noreferrer" className="text-[.8rem] text-[#7aa2ff] break-all">
                  {hostDoSite(d.site)}
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="w-11 h-11 grid place-items-center rounded-xl border border-[var(--line-2)] text-[#8a8a85] hover:text-white shrink-0">✕</button>
        </div>

        <div className="grid gap-3 p-4 sm:p-6">
          {erro && <Vazio>Não foi possível abrir este cliente agora.</Vazio>}
          {!d && !erro && <Vazio>Carregando…</Vazio>}
          {d && (
            <>
              <Bloco titulo="Saúde do site"><Saude d={d} /></Bloco>

              <Bloco titulo="Métricas do site">
                {d.pixel ? (
                  <div>
                    <div className="nums text-[1.6rem] leading-none">{d.pixel.n.toLocaleString("pt-BR")}</div>
                    <p className="mt-1 text-[.8rem] text-[#8a8a85]">pageviews pelo pixel · último acesso {relativo(d.pixel.ultimo.replace(" ", "T"))}</p>
                  </div>
                ) : (
                  <Vazio>Nenhum hit ainda: instale o pixel e visite o site</Vazio>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a href={d.clarityUrl} target="_blank" rel="noopener noreferrer" className={btnSecundario}>abrir o Clarity</a>
                  <span className="text-[.76rem] text-[#8a8a85]">Números do Clarity: pendente de API</span>
                </div>
              </Bloco>

              <Bloco titulo="Financeiro" extra={<button onClick={() => { setF({ valor_projeto: d.valorProjeto ? String(d.valorProjeto) : "", recorrencia: d.recorrencia ? String(d.recorrencia) : "", site: d.site || "" }); setEdit(!edit); }} className="text-[.78rem] text-[#7aa2ff] h-10 px-2">{edit ? "cancelar" : "editar dados"}</button>}>
                {edit && (
                  <form onSubmit={salvarDados} className="grid gap-2 mb-4">
                    <input className={campoCls} inputMode="decimal" placeholder="Valor do projeto (ex.: 1997)" value={f.valor_projeto} onChange={(e) => setF({ ...f, valor_projeto: e.target.value })} aria-label="Valor do projeto" />
                    <input className={campoCls} inputMode="decimal" placeholder="Recorrência mensal (ex.: 150)" value={f.recorrencia} onChange={(e) => setF({ ...f, recorrencia: e.target.value })} aria-label="Recorrência mensal" />
                    <input className={campoCls} placeholder="Endereço do site" value={f.site} onChange={(e) => setF({ ...f, site: e.target.value })} aria-label="Site" />
                    <button className={btnPrimario} type="submit">salvar</button>
                  </form>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[var(--line)] bg-white/3 px-3 py-3">
                    <div className="mono" style={{ fontSize: "0.66rem" }}>Valor do projeto</div>
                    <div className="mt-1 text-[.95rem] font-medium">{d.valorProjeto ? brl(d.valorProjeto) : "não informado"}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--line)] bg-white/3 px-3 py-3">
                    <div className="mono" style={{ fontSize: "0.66rem" }}>Recorrência</div>
                    <div className="mt-1 text-[.95rem] font-medium">{d.recorrencia ? `${brl(d.recorrencia)} por mês` : "sem recorrência ainda"}</div>
                  </div>
                </div>
                {d.financeiro.divergencia && (
                  <div role="alert" data-divergencia className="mt-3 text-balance rounded-xl border border-[#e0a83c]/40 bg-[#e0a83c]/8 px-4 py-3 text-[.84rem] text-[#e0c07a]">
                    O valor do projeto é {brl(d.financeiro.divergencia.esperado)}, mas as cobranças pagas somam {brl(d.financeiro.divergencia.pago)}.
                  </div>
                )}
                {d.financeiro.cobrancas.length === 0 ? (
                  <p className="mt-3 text-[.84rem] text-[#8a8a85] text-balance">Sem cobrança registrada para este cliente.</p>
                ) : (
                  <div className="mt-3 grid gap-3">
                    {d.financeiro.proximosVencimentos.length > 0 && (
                      <div>
                        <div className="mono mb-1" style={{ fontSize: "0.66rem" }}>Próximos vencimentos</div>
                        {d.financeiro.proximosVencimentos.map((c) => (
                          <div key={c.id} className="flex justify-between gap-2 text-[.84rem] py-1">
                            <span className="truncate">{c.descricao}</span>
                            <span className="shrink-0">{brl(c.valor)} · {dataCurta(c.vencimento)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <div className="mono mb-1" style={{ fontSize: "0.66rem" }}>Cobranças</div>
                      {d.financeiro.cobrancas.map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-2 py-2 border-b border-[var(--line)] last:border-0" data-cobranca>
                          <div className="min-w-0">
                            <div className="text-[.84rem] truncate">{c.descricao}</div>
                            <div className="text-[.74rem] text-[#8a8a85]">{c.status === "pago" ? `Pago ${dataCurta(c.pagoEm || c.data)}` : c.data ? `Criada ${dataCurta(c.data)}` : "Aguardando pagamento"}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[.84rem]">{brl(c.valor)}</span>
                            <Chip tom={c.status === "pago" ? "ok" : "aviso"}>{c.status}</Chip>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Bloco>

              <Briefing d={d} recarregar={recarregar} />
              <Cofre d={d} recarregar={recarregar} />
              <Contrato d={d} recarregar={recarregar} />
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

// ---------- tela ----------
export function Clientes() {
  const [clientes, setClientes] = useState<CardCliente[]>([]);
  const [resumo, setResumo] = useState<Resumo>({ ativos: 0, novosNoMes: 0 });
  const [carregado, setCarregado] = useState(false);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [f, setF] = useState({ nome: "", segmento: "", site: "", valor_projeto: "", recorrencia: "" });
  const [erro, setErro] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/clientes");
      if (r.status === 401) { location.href = "/login"; return; }
      const j = await r.json();
      setClientes(Array.isArray(j.clientes) ? j.clientes : []);
      if (j.resumo) setResumo(j.resumo);
    } catch {
      /* offline */
    } finally {
      setCarregado(true);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? clientes.filter((c) => `${c.nome} ${c.segmento} ${c.cidade}`.toLowerCase().includes(q)) : clientes;
  }, [clientes, busca]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const r = await api({ action: "criar", ...f });
    if (!r.ok) return setErro(String(r.error || "Não foi possível cadastrar."));
    setF({ nome: "", segmento: "", site: "", valor_projeto: "", recorrencia: "" });
    setNovo(false);
    await load();
    if (typeof r.id === "string") setAberto(r.id);
  }

  if (!carregado) return <div className="text-[.85rem] text-[#8a8a85]">carregando clientes…</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-5">
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-2)] px-4 py-3 sm:min-w-[130px]">
            <b className="nums text-[1.15rem] leading-none">{resumo.ativos}</b>
            <div className="mono mt-1.5" style={{ fontSize: "0.68rem" }}>clientes ativos</div>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-2)] px-4 py-3 sm:min-w-[130px]">
            <b className="nums text-[1.15rem] leading-none">{resumo.novosNoMes}</b>
            <div className="mono mt-1.5" style={{ fontSize: "0.68rem" }}>novos no mês</div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input className={campoCls + " sm:w-[240px]"} placeholder="Buscar cliente" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar cliente" />
          <button className={btnPrimario + " h-[48px]"} onClick={() => setNovo(!novo)}>{novo ? "cancelar" : "+ novo cliente"}</button>
        </div>
      </div>

      {novo && (
        <form onSubmit={criar} className="card p-4 sm:p-5 mb-5 grid gap-2 sm:grid-cols-2">
          <input className={campoCls} placeholder="Nome do cliente" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} aria-label="Nome do cliente" />
          <input className={campoCls} placeholder="Segmento" value={f.segmento} onChange={(e) => setF({ ...f, segmento: e.target.value })} aria-label="Segmento" />
          <input className={campoCls} placeholder="Site" value={f.site} onChange={(e) => setF({ ...f, site: e.target.value })} aria-label="Site" />
          <input className={campoCls} inputMode="decimal" placeholder="Valor do projeto" value={f.valor_projeto} onChange={(e) => setF({ ...f, valor_projeto: e.target.value })} aria-label="Valor do projeto" />
          <input className={campoCls} inputMode="decimal" placeholder="Recorrência mensal (opcional)" value={f.recorrencia} onChange={(e) => setF({ ...f, recorrencia: e.target.value })} aria-label="Recorrência mensal" />
          <button className={btnPrimario + " h-[48px]"} type="submit" disabled={!f.nome.trim()}>cadastrar cliente</button>
          {erro && <p role="alert" className="text-[.8rem] text-[#fb6a6a] sm:col-span-2">{erro}</p>}
        </form>
      )}

      {clientes.length === 0 ? (
        <div className="card p-8 text-center text-[.84rem] text-[#6b6b66] text-balance">
          Nenhum cliente cadastrado ainda. Feche um lead no Comercial ou use “+ novo cliente”.
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card p-8 text-center text-[.84rem] text-[#6b6b66] text-balance">Nenhum cliente encontrado para essa busca.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-grade>
          {filtrados.map((c) => (
            <button
              key={c.id}
              onClick={() => setAberto(c.id)}
              data-card-cliente={c.id}
              className="card text-left p-4 sm:p-5 min-w-0 grid gap-3 hover:bg-[var(--bg-3)] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[.98rem] font-medium tracking-[-.01em] text-balance">{c.nome}</div>
                  {(c.segmento || c.cidade) && <div className="text-[.78rem] text-[#8a8a85] mt-0.5">{[c.segmento, c.cidade].filter(Boolean).join(" · ")}</div>}
                </div>
                {c.status && <Chip tom={c.status === "ativo" || c.status === "entregue" ? "ok" : undefined}>{c.status}</Chip>}
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[.8rem]">
                <div><dt className="mono" style={{ fontSize: "0.62rem" }}>Fechamento</dt><dd className="mt-0.5">{c.fechadoEm ? dataLonga(c.fechadoEm) : "sem data"}</dd></div>
                <div><dt className="mono" style={{ fontSize: "0.62rem" }}>Projeto</dt><dd className="mt-0.5">{c.valorProjeto ? brl(c.valorProjeto) : "não informado"}</dd></div>
                <div><dt className="mono" style={{ fontSize: "0.62rem" }}>Recorrência</dt><dd className="mt-0.5">{c.recorrencia ? `${brl(c.recorrencia)} por mês` : "sem recorrência ainda"}</dd></div>
                <div className="min-w-0"><dt className="mono" style={{ fontSize: "0.62rem" }}>Site</dt><dd className="mt-0.5 break-all">{c.site ? hostDoSite(c.site) : "sem site"}</dd></div>
              </dl>
              <div className="text-[.76rem] text-[#8a8a85]">
                {c.site ? (c.pageviews ? `${c.pageviews.toLocaleString("pt-BR")} acessos pelo pixel` : "sem acessos registrados ainda") : "cadastre o site para medir acessos"}
              </div>
            </button>
          ))}
        </div>
      )}

      {aberto && <Gaveta id={aberto} onClose={() => setAberto(null)} onMudou={load} />}
    </div>
  );
}
