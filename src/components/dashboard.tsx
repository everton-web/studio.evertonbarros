"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  Home, Calendar, LayoutGrid, Target, Users, FolderOpen, Ellipsis, BarChart3,
  MessageCircle, LogOut, ChevronsRight, ChevronsLeft,
} from "lucide-react";
import { Chat } from "./chat";
import { Files } from "./files";
import { Pipeline } from "./pipeline";
import { Rastreamento } from "./rastreamento";
import { Analytics } from "./analytics";
import { Hoje } from "./hoje";
import { Agenda } from "./agenda";
import { Operacao } from "./operacao";
import { Clientes } from "./clientes";
import { TimeRodape } from "./time-rodape";

// ---------- tipos ----------
type Data = {
  placar: { progresso: number; acumulado: number; meta: number; fase: string };
  pipeline: {
    id: string; nome: string; segmento: string; cidade: string; nota: number;
    avaliacoes: number; site: string; contato: string; whatsapp: string; email: string;
    categoria: string; estagio: number; status: string;
    solucao: string; motivo: string; porque: string; mensagem: string; movs: string[]; criado: string;
    contatadoEm: string; respondeuEm: string; desfecho: string; desfechoEm: string;
  }[];
  rastreamento: { sites: Record<string, { n: number; primeiro: string; ultimo: string }>; total: number };
};

const NAV = [
  { id: "hoje", label: "Hoje", dot: "#FF4000" },
  { id: "agenda", label: "Agenda", dot: "#a86ff0" },
  { id: "operacao", label: "Operação", dot: "#54b8f0" },
  { id: "pipeline", label: "Comercial", dot: "#7aa2ff" },
  { id: "clientes", label: "Clientes", dot: "#3ddc84" },
  { id: "arquivos", label: "Conteúdo", dot: "#d9a03a" },
  { id: "analytics", label: "Resultados", dot: "#fb7185" },
];
// navegação de app no celular: 4 destinos + "Mais" (sheet com o restante)
const TABS = [
  { id: "hoje", label: "Hoje" },
  { id: "agenda", label: "Agenda" },
  { id: "operacao", label: "Operação" },
  { id: "pipeline", label: "Comercial" },
  { id: "mais", label: "Mais" },
];
const NAV_GRUPOS: { nome: string; ids: string[] }[] = [
  { nome: "Operar", ids: ["hoje", "agenda", "operacao"] },
  { nome: "Crescer", ids: ["pipeline", "clientes", "arquivos", "analytics"] },
];
const MORE_IDS = ["clientes", "arquivos", "analytics"];
const ease = [0.22, 1, 0.36, 1] as const;
const fmt = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");

// cabeçalho padrão do SaaS (título + subtítulo) por view
const VIEW_META: Record<string, { titulo: string; sub: string }> = {
  hoje: { titulo: "Hoje", sub: "O dia inteiro numa tela: o que depende de você, a agenda e o placar real." },
  agenda: { titulo: "Agenda", sub: "Dia, semana e mês no mesmo lugar. Reuniões nascem aqui, sem importar de fora." },
  operacao: { titulo: "Operação", sub: "A mesma demanda em quadro, lista e calendário. Uma fonte única, várias visões." },
  pipeline: { titulo: "Comercial", sub: "Leads do estágio 0 ao 5: o agente audita os sites, você aprova e aborda." },
  clientes: { titulo: "Clientes", sub: "Quem já fechou: como está o site, o que já pagou e os acessos guardados." },
  arquivos: { titulo: "Conteúdo", sub: "Insumo (uploads do cliente) e saída (cases/portfólio) no mesmo lugar." },
  analytics: { titulo: "Resultados", sub: "Como estamos: tráfego, CPL e ROI mais o placar dos R$ 100k. A vitrine da plataforma." },
};

// ícones lucide (referência: https://lucide.dev)
const ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  hoje: Home,
  agenda: Calendar,
  operacao: LayoutGrid,
  clientes: Users,
  pipeline: Target,
  arquivos: FolderOpen,
  analytics: BarChart3,
  mais: Ellipsis,
};

function Triangle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor">
      <path d="M50 10 Q58.6 45 84.6 70 Q50 60 15.4 70 Q41.4 45 50 10Z" />
    </svg>
  );
}

// ---------- hero do placar (na sidebar) ----------
function Placar({ p, menor }: { p: Data["placar"]; menor?: boolean }) {
  if (menor) {
    const title = `${fmt(p.acumulado)} de ${fmt(p.meta)} (progresso ${p.progresso}%)`;
    return (
      <div className="flex justify-center" title={title}>
        <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90" role="img" aria-label={title}>
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3ddc84" strokeWidth="3" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.min(100, p.progresso)} 100`} />
        </svg>
      </div>
    );
  }
  return (
    <div>
      <div className="mono mb-2">Faturado</div>
      <div className="text-[1.7rem] leading-none font-medium tracking-[-.03em] text-[#3ddc84] tabular-nums mb-3">
        {fmt(p.acumulado)}
      </div>
      <div className="h-[3px] rounded-full bg-white/8 overflow-hidden mb-2">
        <motion.div
          className="h-full bg-[#3ddc84]"
          initial={{ width: 0 }}
          animate={{ width: Math.min(100, p.progresso) + "%" }}
          transition={{ duration: 1.2, ease, delay: 0.3 }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[.75rem] text-[var(--warn)]">{p.fase || "-"}</span>
        <span className="mono">{p.progresso}%</span>
      </div>
    </div>
  );
}

// ---------- dashboard ----------
export function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [view, setView] = useState("hoje");
  const [moreOpen, setMoreOpen] = useState(false);
  const [navMenor, setNavMenor] = useState<boolean>(() => {
    try { return typeof window !== "undefined" && localStorage.getItem("navMenor") === "1"; } catch { return false; }
  });
  const [chatOpen, setChatOpen] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/data");
    if (r.status === 401) { location.href = "/login"; return; }
    setData(await r.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    try { localStorage.setItem("navMenor", navMenor ? "1" : "0"); } catch {}
  }, [navMenor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setChatOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(id: string) {
    setView(id);
    setMoreOpen(false);
    // cada aba abre no topo (no celular a rolagem da aba anterior deixava a nova "vazia")
    window.scrollTo({ top: 0 });
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    location.href = "/login";
  }

  if (!data) {
    return (
      <div className="grain min-h-screen grid place-items-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-7 h-7 rounded-full border-2 border-white/15 border-t-[#FF4000]"
        />
      </div>
    );
  }

  const activeNav = NAV.find((n) => n.id === view) || NAV[0];

  return (
    <MotionConfig reducedMotion="user">
      <div className="grain flex min-h-screen">
        {/* ===== sidebar (desktop ≥ 1024) ===== */}
        <aside className={`hidden lg:flex ${navMenor ? "w-[var(--sidebar-w-min)]" : "w-[var(--sidebar-w)]"} shrink-0 min-w-0 overflow-hidden flex-col bg-[var(--bg-1)] border-r border-[var(--line)] transition-[width] duration-200 sticky top-0 h-screen`}>
          <div className={`flex items-center gap-3 h-16 border-b border-[var(--line)] ${navMenor ? "justify-center px-2" : "px-5"}`}>
            <motion.span whileHover={{ rotate: 180 }} transition={{ duration: 0.5 }}>
              <Triangle className="w-[17px] h-[17px] text-[#FF4000]" />
            </motion.span>
            <div className="overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200" style={{ maxWidth: navMenor ? 0 : 220, opacity: navMenor ? 0 : 1 }}>
              <div className="text-[.92rem] font-medium tracking-[-.02em] leading-none">Agência</div>
              <div className="mono mt-1" style={{ fontSize: "0.7rem" }}>{data.placar.fase || "Comando"}</div>
            </div>
          </div>

          <nav className="flex-1 py-4 px-2.5 space-y-4 overflow-y-auto">
            {NAV_GRUPOS.map((g) => (
              <div key={g.nome}>
                <div className={`mono mb-1.5 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ${navMenor ? "px-0" : "px-3"}`} style={{ maxWidth: navMenor ? 0 : 220, opacity: navMenor ? 0 : 1, fontSize: "0.68rem" }}>{g.nome}</div>
                <div className="space-y-0.5">
                  {g.ids.map((id) => {
                    const n = NAV.find((x) => x.id === id)!;
                    const active = view === n.id;
                    const Icon = ICONS[n.id];
                    return (
                      <button
                        key={n.id}
                        onClick={() => go(n.id)}
                        aria-current={active ? "page" : undefined}
                        aria-label={navMenor ? n.label : undefined}
                        title={n.label}
                        className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl relative transition-colors ${
                          active ? "bg-white/5 text-white" : "text-[#7d7d78] hover:text-[#d8d8d4] hover:bg-white/3"
                        } ${navMenor ? "justify-center !px-2 !gap-0" : ""}`}
                      >
                        {active && (
                          <motion.span
                            layoutId="nav-line"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-full bg-[#FF4000]"
                            transition={{ duration: 0.45, ease }}
                          />
                        )}
                        <Icon className="w-[17px] h-[17px] shrink-0" strokeWidth={1.7} />
                        <span className="text-[.83rem] tracking-[-.01em] overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200" style={{ maxWidth: navMenor ? 0 : 200, opacity: navMenor ? 0 : 1 }}>{n.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {!navMenor && (
            <button onClick={() => setNavMenor(true)} aria-label="recolher menu"
              className="ml-auto mr-3 mb-1 h-8 flex items-center gap-1.5 mono text-[#5c5c58] hover:text-white transition-colors" style={{ fontSize: "0.68rem" }}>
              <ChevronsLeft className="w-4 h-4" strokeWidth={1.7} />
              recolher
            </button>
          )}
          <div className={`py-4 border-t border-[var(--line)] ${navMenor ? "px-3" : "px-5"}`}>
            <Placar p={data.placar} menor={navMenor} />
            {navMenor ? (
              <button
                onClick={logout}
                title="sair da sessão"
                aria-label="sair da sessão"
                className="w-10 h-10 mt-4 mx-auto flex items-center justify-center rounded-lg border border-[var(--line)] hover:border-white/20 hover:text-white text-[#7d7d78] transition-colors"
              >
                <LogOut className="w-[18px] h-[18px]" strokeWidth={1.7} />
              </button>
            ) : (
              <button
                onClick={logout}
                className="w-full mt-4 flex items-center justify-center gap-2 mono py-2.5 rounded-lg border border-[var(--line)] hover:border-white/20 hover:text-white text-[#7d7d78] transition-colors"
                style={{ fontSize: "0.66rem" }}
              >
                sair da sessão
              </button>
            )}
            {navMenor && (
              <button onClick={() => setNavMenor(false)} title="expandir menu" aria-label="expandir menu"
                className="w-10 h-10 mt-3 mx-auto flex items-center justify-center rounded-lg border border-[var(--line)] text-[#5c5c58] hover:text-white transition-colors">
                <ChevronsRight className="w-4 h-4" strokeWidth={1.7} />
              </button>
            )}
          </div>
        </aside>

        {/* ===== coluna do app ===== */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* top app bar (mobile < 1024) */}
          <header
            className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 border-b border-[var(--line)] bg-[rgba(10,10,11,.82)] backdrop-blur-2xl"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)", paddingBottom: "10px" }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Triangle className="w-[16px] h-[16px] text-[#FF4000] shrink-0" />
              <span className="text-[.92rem] font-medium tracking-[-.02em] leading-none truncate">Agência</span>
              <span className="mono truncate">{activeNav.label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="mono text-[#3ddc84] tabular-nums">{data.placar.progresso}%</span>
              <span className="text-[.72rem] text-[#8a8a85]">R$ {Math.round(data.placar.acumulado / 1000)}k</span>
            </div>
          </header>

          {/* conteúdo */}
          <main className="flex-1 min-w-0 px-5 md:px-8 lg:px-10 pt-6 lg:pt-10 pb-24 lg:pb-14">
            <div className="max-w-[var(--content-max)] mx-auto">
              {/* header — padrão studio (título + subtítulo) */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease }}
                className="mb-8"
              >
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mono mb-3">{activeNav.label}</div>
                    <h1 className="text-[clamp(1.5rem,2.6vw,1.75rem)] font-semibold tracking-[-.025em] leading-tight text-balance">
                      {VIEW_META[view]?.titulo}
                    </h1>
                    <p className="text-[.875rem] text-[var(--muted)] mt-2 max-w-[620px] leading-relaxed">
                      {VIEW_META[view]?.sub}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 pt-1">
                    {view !== "operacao" && view !== "clientes" && (
                      <button onClick={() => go("operacao")}
                        className="flex items-center gap-2 h-[42px] px-4 rounded-xl bg-[#06b6d4]/12 border border-[#06b6d4]/30 text-[#22c8e5] text-[.8rem] font-semibold transition-colors hover:bg-[#06b6d4]/20">
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                        nova demanda
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* corpo */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease }}
                >
                  {view === "hoje" && <Hoje placar={data.placar} />}
                  {view === "agenda" && <Agenda />}
                  {view === "operacao" && <Operacao />}
                  {view === "pipeline" && <Pipeline leads={data.pipeline} refresh={load} onIrClientes={() => go("clientes")} />}
                  {view === "clientes" && <Clientes />}
                  {view === "arquivos" && <Files />}
                  {view === "analytics" && (
                    <div className="space-y-6">
                      <Analytics sites={data.rastreamento.sites} leads={data.pipeline} siteAlvo="evertonbrito.com" />
                      <Rastreamento data={data.rastreamento} site="evertonbrito.com" />
                      <Financas p={data.placar} />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Time no rodapé (recolhido por padrão) */}
              <TimeRodape />
            </div>
          </main>
        </div>

        {/* ===== assistente transversal (⌘K / botão flutuante) ===== */}
        <button
          onClick={() => setChatOpen(true)}
          aria-label="abrir assistente"
          className="fixed z-40 right-4 lg:right-6 bottom-[88px] lg:bottom-6 h-11 px-5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-[.82rem] shadow-[var(--shadow-overlay)] hover:bg-[var(--accent-2)] transition-colors inline-flex items-center gap-2"
        >
          <MessageCircle className="w-[18px] h-[18px]" strokeWidth={1.9} />
          <span className="hidden sm:inline">Assistente</span>
        </button>

        <AnimatePresence>
          {chatOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setChatOpen(false)}
              />
              <motion.aside
                className="fixed top-0 right-0 z-50 h-screen w-full sm:w-[440px] bg-[var(--bg-1)] border-l border-[var(--line)] flex flex-col"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 40, opacity: 0 }}
                transition={{ duration: 0.28, ease }}
                role="dialog"
                aria-label="assistente"
              >
                <div className="h-16 shrink-0 flex items-center justify-between px-5 border-b border-[var(--line)]">
                  <span className="label">Assistente</span>
                  <button
                    onClick={() => setChatOpen(false)}
                    aria-label="fechar assistente"
                    className="w-9 h-9 grid place-items-center rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-2)] transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-5"><Chat /></div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ===== bottom tab bar (mobile < 1024) ===== */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--line)] bg-[rgba(10,10,11,.86)] backdrop-blur-2xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="navegação"
        >
          <div className="grid grid-cols-5">
            {TABS.map((t) => {
              const isMore = t.id === "mais";
              const active = isMore ? moreOpen || MORE_IDS.includes(view) : view === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => (isMore ? setMoreOpen(true) : go(t.id))}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex flex-col items-center justify-center gap-1 h-16 transition-colors ${
                    active ? "text-white" : "text-[#5c5c58] hover:text-[#b8b8b3]"
                  }`}
                >
                  <span className={`absolute top-0 w-8 h-[3px] rounded-b-full transition-colors ${active ? "bg-[#FF4000]" : "bg-transparent"}`} />
                  {(() => { const Icon = ICONS[t.id]; return <Icon className={`w-6 h-6 ${active ? "text-[#FF4000]" : ""}`} strokeWidth={1.8} />; })()}
                  <span className="text-[.75rem] tracking-tight leading-none">{t.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* ===== sheet "Mais" (mobile) ===== */}
        <AnimatePresence>
          {moreOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMoreOpen(false)}
              />
              <motion.div
                className="fixed bottom-0 inset-x-0 z-50 lg:hidden rounded-t-[24px] border-t border-[var(--line)] bg-[var(--bg-2)] max-h-[82vh] overflow-y-auto"
                style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
                initial={{ y: 90, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ duration: 0.32, ease }}
                role="dialog"
                aria-label="mais opções"
              >
                <div className="sticky top-0 z-10 bg-[var(--bg-2)]/95 backdrop-blur px-5 pt-4 pb-3 flex items-center justify-between border-b border-[var(--line)]">
                  <span className="mono">Mais</span>
                  <button
                    onClick={() => setMoreOpen(false)}
                    aria-label="fechar"
                    className="w-9 h-9 grid place-items-center rounded-lg border border-white/10 text-[#b8b8b3] hover:text-white hover:border-white/25 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-4 space-y-1">
                  {MORE_IDS.map((id) => {
                    const n = NAV.find((x) => x.id === id)!;
                    const active = view === id;
                    return (
                      <button
                        key={id}
                        onClick={() => go(id)}
                        className={`w-full flex items-center gap-3.5 px-3.5 py-4 rounded-xl text-left transition-colors ${
                          active ? "text-white bg-white/5" : "text-[#b8b8b3] hover:bg-white/4"
                        }`}
                      >
                        {(() => { const Icon = ICONS[id]; return <Icon className="w-[19px] h-[19px] shrink-0" strokeWidth={1.7} />; })()}
                        <span className="text-[.9rem] tracking-[-.01em]">{n.label}</span>
                        {active && <span className="ml-auto text-[#FF4000] text-[.7rem]">●</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="px-4 pb-4">
                  <div className="bg-white/4 border border-[var(--line)] rounded-2xl p-4 mb-3 mt-1">
                    <Placar p={data.placar} />
                  </div>
                  <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 mono py-3.5 rounded-xl border border-[var(--line)] hover:border-white/20 hover:text-white text-[#8a8a85] transition-colors"
                    style={{ fontSize: "0.7rem" }}
                  >
                    sair da sessão
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

// ---------- finanças (InfinitePay) ----------
type LinkReg = {
  id: string; data: string; descricao: string; valor: number; quantidade: number;
  url: string | null; handle: string; ok: boolean; erro?: string;
  order_nsu?: string; slug?: string; paid?: boolean; paidAt?: string; capture_method?: string;
};
function Financas({ p }: { p: Data["placar"] }) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [qtd, setQtd] = useState("1");
  const [nomeCli, setNomeCli] = useState("");
  const [emailCli, setEmailCli] = useState("");
  const [telCli, setTelCli] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [criado, setCriado] = useState<LinkReg | null>(null);
  const [historico, setHistorico] = useState<LinkReg[]>([]);
  const [handle, setHandle] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const carregar = async () => {
    try {
      const r = await fetch("/api/financas");
      if (r.status === 401) { location.href = "/login"; return; }
      const j = await r.json();
      setHandle(j.handle || null);
      setHistorico(j.historico || []);
    } catch { /* offline */ }
  };
  useEffect(() => { carregar(); }, []);

  async function gerar() {
    setErro(""); setCriado(null);
    if (!descricao.trim()) { setErro("Dê uma descrição para a cobrança."); return; }
    if (!valor || Number(valor) <= 0) { setErro("Informe um valor válido (R$)."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/financas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link", descricao: descricao.trim(), valor: Number(String(valor).replace(",", ".")), quantidade: Number(qtd) || 1, customer: { nome: nomeCli.trim(), email: emailCli.trim(), telefone: telCli.trim() } }),
      });
      const j = await r.json();
      if (j.ok && j.registro?.url) { setCriado(j.registro); carregar(); }
      else setErro(j.erro || "Não foi possível gerar o link.");
    } catch { setErro("Falha de rede."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {/* placar grande */}
      <div className="card p-6">
        <div className="mono mb-3">Faturamento acumulado</div>
        <div className="text-[clamp(2.4rem,6vw,3.6rem)] leading-none font-medium tracking-[-.04em] text-[#3ddc84] tabular-nums">
          {fmt(p.acumulado)}
        </div>
        <div className="flex items-center gap-4 mt-6">
          <div className="flex-1 h-[4px] rounded-full bg-white/8 overflow-hidden">
            <motion.div
              className="h-full bg-[#3ddc84]"
              initial={{ width: 0 }}
              animate={{ width: Math.min(100, p.progresso) + "%" }}
              transition={{ duration: 1.2, ease }}
            />
          </div>
          <span className="mono tabular-nums" style={{ fontSize: "0.68rem" }}>{p.progresso}% · meta R$ 100k</span>
        </div>
        <p className="mono mt-4" style={{ fontSize: "0.7rem" }}>fase atual · {p.fase || "-"}</p>
      </div>

      {/* gerar link de pagamento (InfinitePay) */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-3 justify-between mb-5">
          <div>
            <div className="text-[1.05rem] font-medium tracking-[-.01em]">Link de pagamento <span className="text-[#3ddc84]">Pix</span></div>
            <p className="text-[.78rem] text-[#8a8a85] mt-1">
              {handle
                ? <>conta conectada · handle <b className="text-[#b8b8b3]">${handle}</b> · webhook ativo: <span className="text-[#b8b8b3]">app.evertonbrito.com/api/infinitepay/webhook</span></>
                : "conta não conectada: coloque INFINITEPAY_HANDLE no .env.local da agência"}
            </p>
          </div>
          {handle && <span className="mono px-2.5 py-1.5 rounded-lg bg-[#3ddc84]/10 border border-[#3ddc84]/25 text-[#3ddc84]" style={{ fontSize: "0.66rem" }}>online</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block sm:col-span-1">
            <span className="mono block mb-2" style={{ fontSize: "0.66rem" }}>O que é</span>
            <input
              value={descricao} onChange={(e) => setDescricao(e.target.value)}
              placeholder="ex.: LP · Clínica X"
              className="w-full h-[50px] bg-white/3 border border-[var(--line)] rounded-xl px-4 text-[.92rem] text-[#f7f7f5] outline-none focus:border-[#FF4000]/70 transition-colors placeholder:text-[#5d5d58]"
            />
          </label>
          <label className="block">
            <span className="mono block mb-2" style={{ fontSize: "0.66rem" }}>Valor (R$)</span>
            <input
              value={valor} onChange={(e) => setValor(e.target.value)} placeholder="1997" inputMode="decimal"
              className="w-full h-[50px] bg-white/3 border border-[var(--line)] rounded-xl px-4 text-[.92rem] text-[#f7f7f5] outline-none focus:border-[#FF4000]/70 transition-colors placeholder:text-[#5d5d58]"
            />
          </label>
          <label className="block">
            <span className="mono block mb-2" style={{ fontSize: "0.66rem" }}>Qtd.</span>
            <input
              value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="numeric" aria-label="quantidade"
              className="w-full h-[50px] bg-white/3 border border-[var(--line)] rounded-xl px-4 text-[.92rem] text-[#f7f7f5] outline-none focus:border-[#FF4000]/70 transition-colors placeholder:text-[#5d5d58]"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <label className="block">
            <span className="mono block mb-2" style={{ fontSize: "0.66rem" }}>Cliente (opcional)</span>
            <input value={nomeCli} onChange={(e) => setNomeCli(e.target.value)} placeholder="Nome" className="w-full h-[50px] bg-white/3 border border-[var(--line)] rounded-xl px-4 text-[.92rem] text-[#f7f7f5] outline-none focus:border-[#FF4000]/70 transition-colors placeholder:text-[#5d5d58]" />
          </label>
          <label className="block">
            <span className="mono block mb-2" style={{ fontSize: "0.66rem" }}>E-mail</span>
            <input value={emailCli} onChange={(e) => setEmailCli(e.target.value)} placeholder="cliente@…" inputMode="email" className="w-full h-[50px] bg-white/3 border border-[var(--line)] rounded-xl px-4 text-[.92rem] text-[#f7f7f5] outline-none focus:border-[#FF4000]/70 transition-colors placeholder:text-[#5d5d58]" />
          </label>
          <label className="block">
            <span className="mono block mb-2" style={{ fontSize: "0.66rem" }}>Telefone</span>
            <input value={telCli} onChange={(e) => setTelCli(e.target.value)} placeholder="+55 71 …" inputMode="tel" className="w-full h-[50px] bg-white/3 border border-[var(--line)] rounded-xl px-4 text-[.92rem] text-[#f7f7f5] outline-none focus:border-[#FF4000]/70 transition-colors placeholder:text-[#5d5d58]" />
          </label>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
          <button
            onClick={gerar} disabled={busy || !handle}
            className="h-[50px] px-6 rounded-[14px] bg-[#FF4000] hover:bg-[#ff5c22] disabled:opacity-50 text-white text-[.88rem] font-medium transition-colors"
          >
            {busy ? "gerando…" : "gerar link de pagamento"}
          </button>
          {erro && <span className="text-[.8rem] text-[#fb7185]">{erro}</span>}
        </div>

        {criado?.url && (
          <div className="mt-5 bg-[#3ddc84]/6 border border-[#3ddc84]/20 rounded-2xl p-5">
            <div className="mono mb-2 text-[#3ddc84]">link gerado · clique pra enviar / copiar</div>
            <a href={criado.url} target="_blank" rel="noreferrer" className="block text-[.92rem] text-[#54b8f0] hover:text-[#8ad0ff] break-all mb-3">
              {criado.url}
            </a>
            <button
              onClick={async () => { try { await navigator.clipboard.writeText(criado.url!); } catch {} setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="h-[44px] px-5 rounded-xl border border-white/12 text-[#e8e8e6] hover:border-white/28 transition-colors"
            >
              {copied ? "copiado ✓" : "copiar link"}
            </button>
          </div>
        )}
      </div>

      {/* histórico recente */}
      {historico.length > 0 && (
        <div className="card p-6">
          <div className="mono mb-4" style={{ fontSize: "0.66rem" }}>links gerados (últimos)</div>
          <div className="space-y-0">
            {historico.map((h) => (
              <div key={h.id} className="flex items-center gap-4 py-3 border-b border-[var(--line)] last:border-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${h.paid ? "bg-[#3ddc84]" : h.ok ? "bg-[#d9a03a]" : "bg-[#fb7185]"}`} />
                <span className="text-[.85rem] truncate flex-1">{h.descricao}</span>
                {h.paid ? (
                  <span className="mono px-2 py-1 rounded-md bg-[#3ddc84]/10 border border-[#3ddc84]/25 text-[#3ddc84] shrink-0" style={{ fontSize: "0.7rem" }}>✓ pago{h.capture_method ? ` · ${h.capture_method}` : ""}</span>
                ) : h.ok ? (
                  <span className="mono shrink-0" style={{ fontSize: "0.7rem", color: "#d9a03a" }}>aguardando pagamento</span>
                ) : (
                  <span className="mono shrink-0" style={{ fontSize: "0.7rem", color: "#fb7185" }}>falhou</span>
                )}
                <span className="mono tabular-nums shrink-0" style={{ fontSize: "0.66rem" }}>R$ {h.valor.toLocaleString("pt-BR")}</span>
                <span className="mono text-[#5d5d58] hidden sm:block shrink-0" style={{ fontSize: "0.68rem" }}>{h.data}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* roteiro do módulo */}
      <div className="card p-6">
        <div className="mono mb-5" style={{ fontSize: "0.66rem" }}>próximos passos do módulo</div>
        <div className="space-y-0">
          {[
            ["Recebimentos", "consultar status do link (payment_check) e marcar como pago no placar", "#3ddc84"],
            ["Placar automático", "faturamento entra direto quando o pagamento confirmar", "#54b8f0"],
            ["QR code", "mostrar o Pix na tela do app pro cliente escanear", "#d9a03a"],
            ["MRR", "recorrências (R$ 350 a 500/mês) cobradas no dia certo", "#a86ff0"],
          ].map(([t, d, c], i) => (
            <div key={i} className="flex items-start gap-4 py-3.5 border-b border-[var(--line)] last:border-0">
              <span className="mono w-6 h-6 shrink-0 rounded-lg grid place-items-center text-[var(--accent-ink)] mt-0.5" style={{ fontSize: "0.66rem", background: c }}>{i}</span>
              <div>
                <div className="text-[.9rem] font-medium tracking-[-.01em]">{t}</div>
                <p className="text-[.78rem] text-[#8a8a85] mt-0.5">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
