"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Check, Trash2, ThumbsDown, MessageCircleOff } from "lucide-react";
import { AnalisePresenca } from "./analise-presenca";
import { montarMensagem, type MsgTipo } from "@/lib/mensagens";
import { calcularConversao, type JanelaConversao, type LeadConversao } from "@/lib/conversao";

// ---------- tipos ----------
export type Lead = {
  id: string;
  nome: string;
  segmento: string;
  cidade: string;
  nota: number;
  avaliacoes: number;
  site: string;
  contato: string;
  whatsapp: string;
  email: string;
  categoria: string;
  frente?: string; // sem-gmn | site-quebrado | site-ruim (prospecção automática)
  estagio: number;
  status: string;
  solucao: string;
  motivo: string;
  porque: string;
  mensagem: string;
  movs: string[];
  criado: string;
  presenca?: number | null;
  analiseEm?: string;
  relatorio?: string;
  contatadoEm: string;
  respondeuEm: string;
  desfecho: string;
  desfechoEm: string;
  cliente?: boolean; // já virou cliente no banco: sai do funil e vive em Clientes
};

// As 3 frentes da prospecção (02/10). Cor por frente para bater o olho no funil.
const FRENTES = [
  { id: "sem-gmn", curto: "Sem Google", longo: "Google Meu Negócio não configurado", cor: "#d9a03a" },
  { id: "site-quebrado", curto: "Site quebrado", longo: "Google Meu Negócio com site quebrado", cor: "#fb7185" },
  { id: "site-ruim", curto: "Site ruim", longo: "Google Meu Negócio com site mal construído", cor: "#7aa2ff" },
] as const;
const frenteDe = (id?: string) => FRENTES.find((x) => x.id === id);

const ESTAGIOS = [
  { nome: "Prospecção", cor: "#54b8f0", qui: "diário 18h a 19h · caio" },
  { nome: "Aprovação", cor: "#FF4000", qui: "você decide" },
  { nome: "Contato", cor: "#d9a03a", qui: "pitch · whatsapp" },
  { nome: "Negociação", cor: "#a86ff0", qui: "proposta → fechamento" },
  { nome: "Desenvolvimento", cor: "#7aa2ff", qui: "davi + theo" },
  { nome: "Entrega", cor: "#3ddc84", qui: "indicação ≥ 3" },
];
const WIP_MAX = 3;
const ease = [0.22, 1, 0.36, 1] as const;

  const notaCor = (n: number) => (n >= 4.5 ? "#3ddc84" : n >= 4 ? "#d9a03a" : "#8a8a85");
const notaLbl = (n: number) => (n > 0 ? n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "sem nota");
const avalLbl = (a: number) => (a > 0 ? `${a}` : "");

function waLink(numero: string, msg: string) {
  const num = (numero || "").replace(/\D/g, "");
  if (!num) return null;
  const n = num.length === 11 && num.startsWith("9") ? "55" + num : num.startsWith("55") ? num : "55" + num;
  return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
}

const CATS: [string, string][] = [
  ["maps", "Maps"],
  ["ia", "IA"],
  ["indicacao", "Indicação"],
  ["site", "Site"],
  ["saas", "SaaS"],
  ["whatsapp", "WhatsApp"],
];
const catLbl = (c: string) => CATS.find(([k]) => k === c)?.[1] || c;

// Rótulos dos nichos que a prospecção (feita na VPS) grava no segmento do lead.
const NICHOS: [string, string][] = [
  ["odontologia", "Odontologia"],
  ["clinicas-medicas", "Clínicas médicas"],
  ["estetica", "Estética"],
  ["advocacia", "Advocacia"],
  ["contabilidade", "Contabilidade"],
  ["imobiliarias", "Imobiliárias"],
  ["restaurantes", "Restaurantes"],
  ["hoteis-pousadas", "Hotéis e pousadas"],
  ["academias", "Academias"],
  ["pet-shops", "Pet shops"],
  ["construcao-reformas", "Construção e reformas"],
  ["escolas-cursos", "Escolas e cursos"],
];

type Flds = {
  nome: string; segmento: string; cidade: string; nota: string; avaliacoes: string;
  site: string; contato: string; whatsapp: string; email: string; categoria: string;
  porque: string; solucao: string;
};
const EMPTY: Flds = {
  nome: "", segmento: "", cidade: "", nota: "", avaliacoes: "", site: "",
  contato: "", whatsapp: "", email: "", categoria: "maps", porque: "", solucao: "",
};

function Field({ label, value, onChange, placeholder, textarea, numero }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; textarea?: boolean; numero?: boolean;
}) {
  const cls = "w-full bg-white/3 border border-[var(--line)] rounded-xl px-4 text-[.92rem] text-[#f7f7f5] outline-none focus:border-[#FF4000]/70 transition-colors placeholder:text-[#5d5d58]";
  return (
    <label className="block">
      <span className="mono block mb-2" style={{ fontSize: "0.66rem" }}>{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={placeholder} className={cls + " py-3 resize-none"} />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={numero ? "decimal" : undefined}
          className={cls + " h-[50px]"}
        />
      )}
    </label>
  );
}

function CardBtn({ children, title, onClick, disabled, color, danger }: {
  children: React.ReactNode; title: string; onClick: (e: React.MouseEvent) => void; disabled?: boolean;
  color?: string; danger?: boolean;
}) {
  return (
    <button
      title={title} aria-label={title} disabled={disabled} onClick={onClick}
      className="w-10 h-10 grid place-items-center text-[.78rem] rounded-lg border transition-all active:scale-95
        disabled:opacity-25 disabled:cursor-not-allowed
        border-white/12 text-[#8a8a85] hover:text-white hover:border-white/30 bg-transparent"
      style={color ? { color, borderColor: color + "44" } : danger ? { color: "#fb7185", borderColor: "#fb718544" } : undefined}
    >
      {children}
    </button>
  );
}

function LeadCard({ lead, onEdit, onMove, onAbordar, onValidar, onApagar, onOpen, onDesfecho, dragging, onDragStart, onDragEnd }: {
  lead: Lead; onEdit: (l: Lead) => void; onMove: (l: Lead, dir: number) => void; onAbordar: (l: Lead) => void;
  onValidar: (l: Lead) => void; onApagar: (l: Lead) => void; onOpen: (l: Lead) => void;
  onDesfecho: (l: Lead, tipo: "sem-interesse" | "sem-resposta") => void;
  dragging?: boolean; onDragStart: (l: Lead) => void; onDragEnd: () => void;
}) {
  const sp = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  return (
    <div
      style={{ opacity: dragging ? 0.4 : 1 }}
      draggable
      onDragStart={(e: React.DragEvent) => { e.dataTransfer.setData("text/plain", lead.id); e.dataTransfer.effectAllowed = "move"; onDragStart(lead); }}
      onDragEnd={() => onDragEnd()}
      onClick={() => onOpen(lead)}
      className="bg-[var(--bg-2)] border border-[var(--line)] rounded-2xl p-5 mb-3 hover:border-white/16 transition-opacity group cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[.92rem] font-medium tracking-[-.01em] truncate">{lead.nome}</span>
            <span className="mono shrink-0 rounded px-1.5 py-0.5" style={{ fontSize: "0.68rem", color: "#b8b8b3", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)" }}>{catLbl(lead.categoria)}</span>
          </div>
          <div className="mono mt-1 truncate" style={{ fontSize: "0.7rem" }}>
            {NICHOS.find(([k]) => k === lead.segmento)?.[1] || lead.segmento || "segmento"}{lead.cidade ? ` · ${lead.cidade}` : ""}
            {avalLbl(lead.avaliacoes) ? ` · ${avalLbl(lead.avaliacoes)} aval.` : ""}
          </div>
          {frenteDe(lead.frente) && (
            <span
              title={frenteDe(lead.frente)!.longo}
              className="mono inline-block mt-1.5 px-2 py-0.5 rounded-md border"
              style={{ fontSize: "0.64rem", color: frenteDe(lead.frente)!.cor, borderColor: frenteDe(lead.frente)!.cor + "55", background: frenteDe(lead.frente)!.cor + "14" }}
            >
              {frenteDe(lead.frente)!.curto}
            </span>
          )}
        </div>
        <span
          className="shrink-0 nums rounded-md px-2 py-1 tabular-nums"
          style={{ fontSize: "0.78rem", fontWeight: 600, color: "#050505", background: notaCor(lead.nota), opacity: lead.nota > 0 ? 1 : 0.5 }}
        >
          {lead.nota > 0 ? "★ " : ""}{notaLbl(lead.nota)}
        </span>
      </div>

      {lead.site && (
        <a
          href={lead.site.startsWith("http") ? lead.site : `https://${lead.site}`}
          target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 text-[.74rem] text-[#54b8f0] hover:text-[#8ad0ff] truncate mb-1.5"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="truncate">{lead.site.replace(/^https?:\/\//, "")}</span>
        </a>
      )}
      {!lead.site && <div className="mono mb-1.5" style={{ fontSize: "0.7rem", color: "#5d5d58" }}>sem site · o ponto</div>}
      {lead.presenca != null && (
        <div className="mono mb-1.5 flex items-center gap-1.5" style={{ fontSize: "0.7rem" }} title="nota de presença digital (análise na ficha)">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: lead.presenca >= 75 ? "#3ddc84" : lead.presenca >= 50 ? "#d9a03a" : "#ff6b4a" }} />
          presença {lead.presenca}/100
        </div>
      )}

      {lead.email && (
        <div className="mono mb-1 truncate text-[#54b8f0]/85 hover:text-[#54b8f0]" style={{ fontSize: "0.7rem" }}>{lead.email}</div>
      )}
      {(lead.whatsapp || lead.contato) && lead.estagio >= 0 && lead.estagio <= 2 && (
        <button
          onClick={sp(() => onAbordar(lead))}
          className="flex items-center justify-center gap-2 mt-2 mb-3 w-full h-[44px] rounded-xl bg-[#3ddc84]/12 border border-[#3ddc84]/25 text-[#3ddc84] text-[.82rem] font-medium transition-colors hover:bg-[#3ddc84]/20"
        >
          WhatsApp
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /><path d="m21.854 2.147-10.94 10.939" /></svg>
        </button>
      )}

      {lead.porque && <p className="text-[.76rem] text-[#b8b8b3] leading-relaxed mb-3 line-clamp-2">{lead.porque}</p>}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
        <div className="flex gap-1.5 min-w-0">
          <CardBtn title="voltar estágio" onClick={sp(() => onMove(lead, -1))} disabled={lead.estagio <= 0}>←</CardBtn>
          <CardBtn title="avançar estágio" onClick={sp(() => onMove(lead, 1))} disabled={lead.estagio >= 5}>→</CardBtn>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          {lead.estagio === 1 && (
            <button
              onClick={sp(() => onValidar(lead))}
              className="flex items-center gap-1.5 h-[40px] px-3 rounded-lg bg-[#3ddc84]/12 border border-[#3ddc84]/30 text-[#3ddc84] text-[.76rem] font-semibold transition-colors hover:bg-[#3ddc84]/22"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={2.4} /> aceitar
            </button>
          )}
          <CardBtn title="apagar lead" onClick={sp(() => onApagar(lead))} danger>
            <Trash2 className="w-[13px] h-[13px]" strokeWidth={2} />
          </CardBtn>
          <button
            onClick={sp(() => onEdit(lead))}
            className="flex items-center gap-2 mono px-2.5 py-2 rounded-lg text-[#8a8a85] hover:text-white hover:bg-white/5 transition-colors"
            style={{ fontSize: "0.7rem" }}
          >
            ficha
          </button>
        </div>
      </div>

      {lead.estagio >= 0 && lead.estagio <= 2 && lead.status !== "arquivado" && (
        <div className="flex items-center gap-2 pt-2 mt-2 border-t border-[var(--line)]">
          <span className="mono mr-auto" style={{ fontSize: "0.66rem", color: "#5d5d58" }}>desfecho</span>
          <button
            onClick={sp(() => onDesfecho(lead, "sem-interesse"))}
            title="sem interesse · recusou" aria-label="sem interesse"
            className="w-11 h-11 grid place-items-center rounded-lg border transition-all active:scale-95 border-[#fb7185]/25 text-[#fb7185]/70 hover:text-[#fb7185] hover:border-[#fb7185]/50 hover:bg-[#fb7185]/8"
          >
            <ThumbsDown className="w-4 h-4" strokeWidth={1.8} />
          </button>
          <button
            onClick={sp(() => onDesfecho(lead, "sem-resposta"))}
            title="sem continuidade · não respondeu" aria-label="sem resposta"
            className="w-11 h-11 grid place-items-center rounded-lg border transition-all active:scale-95 border-white/12 text-[#8a8a85] hover:text-white hover:border-white/30 hover:bg-white/5"
          >
            <MessageCircleOff className="w-4 h-4" strokeWidth={1.8} />
          </button>
        </div>
      )}
    </div>
  );
}

function Modal({ open, title, onClose, children }: {
  open: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed z-[60] lg:mx-auto lg:inset-0 lg:flex lg:items-center lg:justify-center pointer-events-none"
            initial="exit" animate="enter" exit="exit"
          >
            <motion.div
              variants={{
                enter: { y: 0, opacity: 1, transition: { duration: 0.34, ease } },
                exit: { y: 40, opacity: 0, transition: { duration: 0.24, ease } },
              }}
              className="pointer-events-auto fixed bottom-0 inset-x-0 lg:static lg:w-[min(92vw,680px)] max-h-[88vh] overflow-y-auto rounded-t-[26px] lg:rounded-[22px] border-t lg:border border-white/9 bg-[var(--bg-2)] shadow-2xl"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 18px)" }}
              role="dialog" aria-label={title}
            >
              <div className="sticky top-0 z-10 bg-[var(--bg-1)] backdrop-blur px-5 sm:px-7 pt-4 pb-3 flex items-center justify-between border-b border-[var(--line)]">
                <span className="mono" style={{ color: "#8a8a85" }}>{title}</span>
                <button onClick={onClose} aria-label="fechar"
                  className="w-9 h-9 grid place-items-center rounded-lg border border-white/10 text-[#b8b8b3] hover:text-white hover:border-white/25 transition-colors">
                  ✕
                </button>
              </div>
              <div className="px-5 sm:px-7 pt-5">{children}</div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Pipeline({ leads, refresh, onIrClientes }: { leads: Lead[]; refresh: () => Promise<void>; onIrClientes?: () => void }) {
  const [modal, setModal] = useState<{ kind: "novo" } | { kind: "editar"; lead: Lead } | null>(null);
  const [abordar, setAbordar] = useState<{ lead: Lead; msg: string; tipo: MsgTipo; analise: { faltas?: { prioridade: string; item: string }[] } | null } | null>(null);
  const [detalhe, setDetalhe] = useState<Lead | null>(null);
  const [f, setF] = useState<Flds>(EMPTY);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [relatorioRes, setRelatorioRes] = useState<{ slug: string; url: string } | null>(null);
  const [relatorioBusy, setRelatorioBusy] = useState(false);
  const [relatorioCopiado, setRelatorioCopiado] = useState(false);
  const [relatorioStatus, setRelatorioStatus] = useState<"" | "entrando" | "noAr" | "demorado">("");
  const relatorioPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [janela, setJanela] = useState<JanelaConversao>("tudo");

  // A prospecção automática roda na VPS por CLI (opção A da migração Supabase).

  // cancela o polling do relatório quando a ficha fecha/troca ou o componente desmonta
  useEffect(() => {
    return () => { if (relatorioPollRef.current) clearTimeout(relatorioPollRef.current); };
  }, []);
  useEffect(() => {
    if (relatorioPollRef.current) clearTimeout(relatorioPollRef.current);
    relatorioPollRef.current = null;
  }, [detalhe]);

  // quem virou cliente sai do funil (fica só em Clientes); a conversão abaixo usa todos
  const viraramCliente = leads.filter((l) => l.cliente);
  const ativos = leads.filter((l) => l.status !== "arquivado" && !l.cliente);
  const arq = leads.filter((l) => l.status === "arquivado" && !l.cliente);

  const conv = calcularConversao(
    leads.map((l) => ({ estagio: l.estagio, status: l.status, contatadoEm: l.contatadoEm, respondeuEm: l.respondeuEm, desfecho: l.desfecho, desfechoEm: l.desfechoEm })) as LeadConversao[],
    janela,
  );

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) { alert(j.error || "Erro"); return false; }
      await refresh();
      return true;
    } catch { alert("Falha de rede"); return false; }
    finally { setBusy(false); }
  }

  const openNovo = () => { setF(EMPTY); setMotivo(""); setModal({ kind: "novo" }); };
  const openEdit = (lead: Lead) => {
    setF({
      nome: lead.nome, segmento: lead.segmento, cidade: lead.cidade,
      nota: lead.nota ? String(lead.nota).replace(".", ",") : "",
      avaliacoes: lead.avaliacoes ? String(lead.avaliacoes) : "",
      site: lead.site, contato: lead.contato, whatsapp: lead.whatsapp, email: lead.email,
      categoria: lead.categoria || "maps", porque: lead.porque, solucao: lead.solucao,
    });
    setMotivo(lead.motivo);
    setModal({ kind: "editar", lead });
  };

  async function salvar() {
    if (!f.nome.trim()) { alert("Nome do lead é obrigatório"); return; }
    const m = modal;
    const p = {
      nome: f.nome.trim(), segmento: f.segmento.trim(), cidade: f.cidade.trim(),
      nota: f.nota.trim(), avaliacoes: f.avaliacoes.trim(), site: f.site.trim(),
      contato: f.contato.trim(), whatsapp: f.whatsapp.trim(), email: f.email.trim(),
      categoria: f.categoria, porque: f.porque.trim(),
    };
    const ok = m?.kind === "novo"
      ? await post({ action: "add", ...p })
      : await post({ action: "update", id: m!.lead.id, ...p, solucao: f.solucao.trim() });
    if (ok) setModal(null);
  }

  const mover = async (l: Lead, dir: number) => {
    await post({ action: "move", id: l.id, estagio: l.estagio + dir });
  };

  const moverId = async (id: string, to: number) => {
    setDragOver(null);
    await post({ action: "move", id, estagio: to });
  };

  const aceitar = async (l: Lead) => {
    // aprovação (estágio 1): avançar para o Contato — solução pode ser detalhada na ficha depois
    await post({ action: "move", id: l.id, estagio: 2 });
  };
  const apagar = async (l: Lead) => {
    if (!confirm(`Apagar "${l.nome}"? A ficha sai do vault. É permanente.`)) return;
    await post({ action: "delete", id: l.id });
  };

  const arquivar = async () => {
    if (!modal || modal.kind !== "editar") return;
    if (!motivo.trim()) { alert("Registre o motivo antes de arquivar"); return; }
    if (await post({ action: "archive", id: modal.lead.id, motivo: motivo.trim() })) setModal(null);
  };
  const reativar = async (l: Lead) => { await post({ action: "reactivate", id: l.id }); };
  const marcarDesfecho = async (l: Lead, tipo: "sem-interesse" | "sem-resposta") => {
    if (!confirm(`Marcar "${l.nome}" como ${tipo === "sem-interesse" ? "sem interesse (recusou)?" : "sem continuidade (não respondeu)?"}`)) return false;
    return await post({ action: "desfecho", id: l.id, desfecho: tipo });
  };
  const registrarResposta = async (l: Lead) => { await post({ action: "responder", id: l.id }); };
  const contatar = (id: string) => {
    fetch("/api/pipeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "contatar", id }) }).catch(() => {});
  };
  const excluir = async () => {
    if (!modal || modal.kind !== "editar") return;
    if (!confirm(`Excluir "${modal.lead.nome}"? O arquivo sai do vault.`)) return;
    if (await post({ action: "delete", id: modal.lead.id })) setModal(null);
  };

  const openAbordar = async (lead: Lead) => {
    let analise: { faltas?: { prioridade: string; item: string }[] } | null = null;
    try {
      const r = await fetch(`/api/analise?id=${encodeURIComponent(lead.id)}`);
      const j = await r.json();
      analise = j.analise || null;
    } catch { /* sem análise — usa a frase genérica de ponto */ }
    setAbordar({
      lead,
      msg: lead.mensagem || montarMensagem("contato", lead, analise, new Date()),
      tipo: "contato",
      analise,
    });
  };
  const openDetalhe = (lead: Lead) => setDetalhe(lead);
  const copiarRelatorio = async (url: string) => {
    try { await navigator.clipboard.writeText(url); setRelatorioCopiado(true); setTimeout(() => setRelatorioCopiado(false), 1800); } catch {}
  };
  const pollRelatorio = (slug: string, tentativa: number) => {
    if (relatorioPollRef.current) clearTimeout(relatorioPollRef.current);
    relatorioPollRef.current = setTimeout(async () => {
      let noAr = false;
      try {
        const r = await fetch("/api/relatorio?slug=" + encodeURIComponent(slug));
        const j = await r.json();
        noAr = !!j.ok;
      } catch { /* rede — tenta de novo */ }
      if (noAr) { setRelatorioStatus("noAr"); return; }
      if (tentativa + 1 >= 20) { setRelatorioStatus("demorado"); return; }
      pollRelatorio(slug, tentativa + 1);
    }, 15000);
  };
  const gerarRelatorio = async (lead: Lead) => {
    setRelatorioBusy(true); setRelatorioRes(null); setRelatorioStatus("");
    if (relatorioPollRef.current) { clearTimeout(relatorioPollRef.current); relatorioPollRef.current = null; }
    try {
      const r = await fetch("/api/relatorio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id }) });
      const j = await r.json();
      if (!j.ok) { alert(j.error || "erro ao gerar relatório"); return; }
      setRelatorioRes({ slug: j.slug, url: j.url });
      setRelatorioStatus("entrando");
      pollRelatorio(j.slug, 0);
      await refresh();
    } catch { alert("falha de rede"); }
    finally { setRelatorioBusy(false); }
  };
  const [mensagemSalva, setMensagemSalva] = useState(false);
  const salvarMensagem = async () => {
    if (!abordar) return;
    await post({ action: "update", id: abordar.lead.id, mensagem: abordar.msg });
    setMensagemSalva(true);
    setTimeout(() => setMensagemSalva(false), 1800);
  };

  const totalValendo = ativos.filter((l) => l.estagio >= 1).length;
  const fechados = viraramCliente.length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="mb-6 card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="mono" style={{ fontSize: "0.66rem" }}>funil de prospecção</div>
          <div className="flex items-center gap-1 rounded-xl border border-white/10 p-1">
            {([7, 30, "tudo"] as const).map((j) => (
              <button
                key={String(j)}
                onClick={() => setJanela(j)}
                className={`px-3 py-1.5 rounded-lg text-[.72rem] transition-colors ${janela === j ? "bg-white/10 text-[#f7f7f5]" : "text-[#8a8a85] hover:text-white"}`}
              >
                {j === "tudo" ? "tudo" : `${j} dias`}
              </button>
            ))}
          </div>
        </div>

        {conv.contatados === 0 ? (
          <p className="text-[.8rem] text-[#8a8a85]">ainda sem contatos registrados</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                ["Contatados", conv.contatados, 100],
                ["Responderam", conv.responderam, conv.pctResposta],
                ["Interessados", conv.interessados, conv.pctInteresse],
                ["Fechados", conv.fechados, conv.pctFechamento],
              ].map(([lbl, n, p]) => (
                <div key={String(lbl)} className="bg-white/3 border border-[var(--line)] rounded-xl px-4 py-3">
                  <div className="mono mb-1" style={{ fontSize: "0.66rem" }}>{lbl}</div>
                  <div className="nums tabular-nums text-[1.15rem] leading-none text-[#f7f7f5]">{n}</div>
                  <div className="mono mt-1" style={{ fontSize: "0.66rem", color: "#8a8a85" }}>{p}%</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="mono inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/12 text-[#9a9a95] bg-white/4" style={{ fontSize: "0.7rem" }}>
                sem resposta · {conv.semResposta} · {conv.pctSemResposta}%
              </span>
              <span className="mono inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#fb7185]/30 text-[#fb7185] bg-[#fb7185]/8" style={{ fontSize: "0.7rem" }}>
                sem interesse · {conv.semInteresse} · {conv.pctSemInteresse}%
              </span>
            </div>
          </>
        )}
      </div>

      {/* barra de comando do pipeline */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { n: ativos.length, lbl: "leads ativos" },
            { n: totalValendo, lbl: "em jogo (aprovado+)" },
            { n: fechados, lbl: "viraram cliente" },
          ].map((s, i) => (
            <div key={i} className="flex flex-col gap-1.5 bg-[var(--bg-2)] border border-[var(--line)] rounded-2xl px-4 py-3 min-w-[104px]">
              <b className="nums tabular-nums text-[1.15rem] leading-none" style={{ color: "#f7f7f5" }}>{String(s.n).padStart(2, "0")}</b>
              <span className="mono" style={{ fontSize: "0.68rem" }}>{s.lbl}</span>
            </div>
          ))}
        </div>
        <button
          onClick={openNovo}
          disabled={busy}
          className="shrink-0 flex items-center justify-center gap-2 h-[52px] px-6 bg-[#FF4000] hover:bg-[#ff5c22] disabled:opacity-60 text-white rounded-[14px] text-[.9rem] font-medium transition-colors"
        >
          + novo lead
        </button>
      </div>

      {/* funil de conversão (studio) */}
      <div className="mb-6 card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="mono" style={{ fontSize: "0.66rem" }}>funil de conversão</div>
        </div>
        <div className="space-y-2.5">
          {ESTAGIOS.map((s, si) => {
            const n = ativos.filter((l) => l.estagio === si).length;
            const max = Math.max(1, ...ESTAGIOS.map((_, x) => ativos.filter((l) => l.estagio === x).length));
            return (
              <div key={si} className="flex items-center gap-3">
                <span className="w-28 text-[.74rem] text-[#9a9a95] shrink-0 truncate">{s.nome}</span>
                <div className="flex-1 h-6 rounded-lg bg-white/4 overflow-hidden">
                  <div
                    className="nums h-full rounded-lg flex items-center px-2.5 transition-all"
                    style={{ width: `${Math.max(n > 0 ? 6 : 0, (n / max) * 100)}%`, background: s.cor + (n ? "E6" : "22") }}
                  >
                    {n > 0 && <span className="text-[.75rem] font-semibold text-[var(--accent-ink)] tabular-nums">{n}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6 estágios + arquivo */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 md:-mx-8 lg:-mx-10 px-5 md:px-8 lg:px-10 snap-x snap-mandatory scrollbar-thin">
        {ESTAGIOS.map((s, si) => {
          const col = ativos.filter((l) => l.estagio === si);
          const over = col.length > WIP_MAX;
          return (
            <div key={si} className="w-[82vw] min-w-[300px] max-w-[340px] shrink-0 snap-start lg:w-[340px]">
              <div className="bg-[var(--bg-1)] border border-[var(--line)] rounded-2xl flex flex-col" style={{ minHeight: 420 }}>
                <div className="px-4 pt-4 pb-3 border-b border-[var(--line)]">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="nums w-6 h-6 rounded-[8px] grid place-items-center shrink-0"
                      style={{ fontSize: "0.74rem", fontWeight: 700, color: "#050505", background: s.cor }}
                    >
                      {si}
                    </span>
                    <span className="text-[.92rem] font-medium tracking-[-.01em]">{s.nome}</span>
                    <span
                      className={`nums ml-auto tabular-nums ${over ? "text-[#fb7185]" : "text-[#f7f7f5]"}`}
                      style={{ fontSize: "0.74rem", fontWeight: 600 }}
                    >
                      {col.length}/{WIP_MAX}
                    </span>
                  </div>
                  <div className="mono mt-2 truncate" style={{ fontSize: "0.68rem" }}>{s.qui}</div>
                  {over && (
                    <div className="mono mt-2 text-[#fb7185]" style={{ fontSize: "0.68rem" }}>
                      ⚠ acima do wip: não atropelar
                    </div>
                  )}
                </div>
                <div
                  className={`p-3 flex-1 rounded-b-2xl transition-colors ${dragOver === si && dragging ? "bg-[#7aa2ff]/8 ring-1 ring-inset ring-[#7aa2ff]/30" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(si); }}
                  onDragLeave={() => setDragOver((v) => (v === si ? null : v))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain");
                    if (id && dragging) moverId(id, si);
                  }}
                >
                  {col.length === 0 && (
                    <div className="text-[.74rem] italic text-[#5d5d58] px-2 py-2">
                      {si === 5 ? "Quem chega aqui vira cliente e sai do funil." : "vazio · rotina 18h a 19h"}
                    </div>
                  )}
                  {si === 5 && viraramCliente.length > 0 && onIrClientes && (
                    <button onClick={onIrClientes} className="w-full text-left text-[.8rem] text-[#3ddc84] px-2 py-3 min-h-[44px]">
                      {viraramCliente.length === 1 ? "1 lead já virou cliente" : `${viraramCliente.length} leads já viraram cliente`}. Ver em Clientes
                    </button>
                  )}
                  {col.map((l) => (
                    <LeadCard
                      key={l.id} lead={l} onEdit={openEdit} onMove={mover} onAbordar={openAbordar}
                      onValidar={aceitar} onApagar={apagar} onOpen={openDetalhe} onDesfecho={marcarDesfecho}
                      dragging={dragging === l.id}
                      onDragStart={() => setDragging(l.id)}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* arquivo */}
        <div className="w-[82vw] min-w-[300px] max-w-[340px] shrink-0 snap-start lg:w-[340px]">
          <div className="border border-dashed border-white/13 rounded-2xl flex flex-col" style={{ minHeight: 420 }}>
            <div className="px-4 pt-4 pb-3 border-b border-[var(--line)]">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-[8px] grid place-items-center mono text-[var(--accent-ink)] shrink-0" style={{ fontSize: "0.68rem", background: "#5d5d58" }}>×</span>
                <span className="text-[.92rem] font-medium tracking-[-.01em] text-[#8a8a85]">Arquivo</span>
                <span className="ml-auto mono tabular-nums" style={{ fontSize: "0.66rem" }}>{arq.length}</span>
              </div>
              <div className="mono mt-2" style={{ fontSize: "0.68rem" }}>motivo registrado · reativável</div>
            </div>
            <div className="p-3 flex-1">
              {arq.length === 0 && <div className="text-[.74rem] italic text-[#5d5d58] px-2 py-2">nada arquivado</div>}
              {arq.map((l) => (
                <motion.div key={l.id} layout className="bg-[var(--bg-2)] border border-[var(--line)] rounded-2xl p-5 mb-3 opacity-70">
                  <div className="text-[.88rem] font-medium tracking-[-.01em] truncate mb-1">{l.nome}</div>
                  {l.motivo && <p className="text-[.74rem] text-[#8a8a85] leading-relaxed mb-3 line-clamp-2">{l.motivo}</p>}
                  {l.desfecho && (
                    <div
                      className={`inline-flex items-center gap-1 mono px-2 py-1 rounded-md mb-2 border ${l.desfecho === "sem-interesse" ? "border-[#fb7185]/30 text-[#fb7185] bg-[#fb7185]/8" : "border-white/12 text-[#9a9a95] bg-white/4"}`}
                      style={{ fontSize: "0.66rem" }}
                    >
                      {l.desfecho === "sem-interesse" ? "sem interesse" : "sem resposta"}
                    </div>
                  )}
                  <button onClick={() => reativar(l)} disabled={busy}
                    className="mono px-3 py-2 rounded-lg border border-[#3ddc84]/25 text-[#3ddc84] hover:bg-[#3ddc84]/8 transition-colors"
                    style={{ fontSize: "0.7rem" }}>
                    ↺ reativar
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* rodapé básico do volante */}
      <div className="mono mt-5 flex items-center gap-3" style={{ fontSize: "0.7rem" }}>
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#3ddc84]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
        </svg>
        volante: entrega → case → conteúdo → próxima venda · ficha de cada lead em <span className="text-[#f7f7f5]">vault/40 Comercial/Leads</span>
      </div>

      {/* ===== modal novo / editar ===== */}
      <Modal open={!!modal} title={modal?.kind === "editar" ? `ficha · ${modal.lead.nome}` : "novo lead"} onClose={() => setModal(null)}>
        <div className="space-y-4 pb-2">
          <Field label="Nome *" value={f.nome} onChange={(v) => setF({ ...f, nome: v })} placeholder="ex.: Clínica Sorriso Forte" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Segmento" value={f.segmento} onChange={(v) => setF({ ...f, segmento: v })} placeholder="ex.: odontologia" />
            <Field label="Cidade" value={f.cidade} onChange={(v) => setF({ ...f, cidade: v })} placeholder="Salvador/BA" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nota no Google" value={f.nota} onChange={(v) => setF({ ...f, nota: v })} placeholder="4.8" numero />
            <Field label="Avaliações" value={f.avaliacoes} onChange={(v) => setF({ ...f, avaliacoes: v })} placeholder="ex.: 120" numero />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Site atual" value={f.site} onChange={(v) => setF({ ...f, site: v })} placeholder="https://… (ou vazio)" />
            <label className="block">
              <span className="mono block mb-2" style={{ fontSize: "0.66rem" }}>Categoria</span>
              <select
                value={f.categoria}
                onChange={(e) => setF({ ...f, categoria: e.target.value })}
                className="w-full h-[50px] bg-[#141416] border border-[var(--line)] rounded-xl px-4 text-[.92rem] text-[#f7f7f5] outline-none focus:border-[#FF4000]/70 transition-colors"
              >
                {CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="WhatsApp (com DDD, 9 dígitos)" value={f.whatsapp} onChange={(v) => setF({ ...f, whatsapp: v })} placeholder="71 98888-0000" />
            <Field label="E-mail público" value={f.email} onChange={(v) => setF({ ...f, email: v })} placeholder="contato@…" />
          </div>
          <Field label="Por que é um bom lead" value={f.porque} onChange={(v) => setF({ ...f, porque: v })} textarea placeholder="nota alta + site fraco (motivo objetivo) + porte que paga…" />

          {modal?.kind === "editar" && (
            <Field label="Solução validada (aprovado → registrar)" value={f.solucao} onChange={(v) => setF({ ...f, solucao: v })} placeholder="ex.: landing page + recorrência" />
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={salvar} disabled={busy}
              className="flex-1 h-[52px] rounded-[14px] bg-[#FF4000] hover:bg-[#ff5c22] disabled:opacity-60 text-white text-[.9rem] font-medium transition-colors"
            >
              {busy ? "salvando…" : modal?.kind === "editar" ? "salvar ficha" : "criar lead · estágio 0"}
            </button>
            {modal?.kind === "editar" && modal.lead.estagio === 5 && (
              <button
                onClick={arquivar} disabled={busy}
                className="h-[52px] px-5 rounded-[14px] border border-[#3ddc84]/25 text-[#3ddc84] hover:bg-[#3ddc84]/8 transition-colors"
              >
                concluir / arquivar
              </button>
            )}
          </div>

          {modal?.kind === "editar" && modal.lead.estagio !== 5 && (
            <div className="border-t border-[var(--line)] pt-4 mt-2">
              <Field label="Motivo do arquivo (não validou)" value={motivo} onChange={setMotivo} placeholder="ex.: site bom, não gasta com isso" />
              <div className="flex gap-3 mt-3">
                <button onClick={arquivar} disabled={busy || modal.lead.status === "arquivado"}
                  className="flex-1 h-[48px] rounded-[12px] border border-white/10 text-[#b8b8b3] hover:text-white hover:border-white/25 transition-colors">
                  {modal.lead.status === "arquivado" ? "já arquivado" : "arquivar"}
                </button>
                <button onClick={excluir} disabled={busy}
                  className="px-5 h-[48px] rounded-[12px] border border-[#fb7185]/30 text-[#fb7185] hover:bg-[#fb7185]/8 transition-colors">
                  excluir
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ===== modal de abordagem (validação antes de enviar) ===== */}
      <Modal open={!!abordar} title={abordar ? `abordar · ${abordar.lead.nome}` : ""} onClose={() => setAbordar(null)}>
        <p className="text-[.8rem] text-[#b8b8b3] mb-4">
          Mensagem de abordagem (base: <span className="text-[#f7f7f5]">mensagens-whatsapp.md</span>, conversa primeiro, sem preço; a promoção do Mês do Zeca entra sozinha até 30/09).
          <b className="text-[#f7f7f5]"> Edite até ficar do seu jeito antes de abrir o WhatsApp.</b>
        </p>
        <textarea
          value={abordar ? abordar.msg : ""}
          onChange={(e) => abordar && setAbordar({ ...abordar, msg: e.target.value })}
          rows={12}
          aria-label="Mensagem de abordagem"
          className="w-full bg-white/3 border border-[var(--line)] rounded-xl px-4 py-3 text-[.92rem] text-[#f7f7f5] outline-none focus:border-[#3ddc84]/70 transition-colors placeholder:text-[#5d5d58] resize-y"
        />
        <div className="mono mt-3 mb-2" style={{ fontSize: "0.68rem" }}>trocar mensagem</div>
        <select
          value={abordar ? abordar.tipo : "contato"}
          onChange={(e) => {
            if (!abordar) return;
            const tipo = e.target.value as MsgTipo;
            setAbordar({ ...abordar, tipo, msg: montarMensagem(tipo, abordar.lead, abordar.analise, new Date()) });
          }}
          aria-label="Modelo de mensagem"
          className="w-full h-[44px] px-3 rounded-xl bg-[var(--bg-2)] border border-[var(--line)] text-[.84rem] text-[#e8e8e6] outline-none focus:border-[#3ddc84]/70 transition-colors"
        >
          <option value="contato">Primeiro contato</option>
          <option value="detalhe">Detalhe</option>
          <option value="oferta">Oferta</option>
          <option value="followup1">Follow-up 1</option>
          <option value="followup2">Follow-up 2</option>
        </select>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={salvarMensagem}
            className={`flex-1 h-[52px] rounded-[14px] border transition-colors ${
              mensagemSalva
                ? "border-[#3ddc84]/40 text-[#3ddc84] bg-[#3ddc84]/8"
                : "border-white/12 text-[#b8b8b3] hover:text-white hover:border-white/28"
            }`}
          >
            {mensagemSalva ? "salva ✓" : "salvar mensagem nesta ficha"}
          </button>
          {abordar && waLink(abordar.lead.whatsapp || abordar.lead.contato, abordar.msg) && (
            <a
              href={waLink(abordar.lead.whatsapp || abordar.lead.contato, abordar.msg)!}
              target="_blank" rel="noreferrer"
              onClick={() => { salvarMensagem(); contatar(abordar.lead.id); }}
              className="flex-1 flex items-center justify-center gap-2 h-[52px] rounded-[14px] bg-[#25d366] hover:bg-[#2ee06f] text-[#04210f] text-[.9rem] font-semibold transition-colors"
            >
              abrir WhatsApp com a mensagem
            </a>
          )}
          {abordar && !waLink(abordar.lead.whatsapp || abordar.lead.contato, abordar.msg) && (
            <div className="flex-1 flex items-center justify-center h-[52px] rounded-[14px] border border-[var(--line)] text-[#8a8a85] text-[.82rem]">
              sem WhatsApp cadastrado: edite a ficha e adicione
            </div>
          )}
        </div>
        <p className="mono mt-4" style={{ fontSize: "0.7rem" }}>
          você valida, edita e decide o envio: a mensagem fica salva na ficha do lead para o próximo contato
        </p>
      </Modal>

      {/* ===== modal de ficha (clique no card) ===== */}
      <Modal open={!!detalhe} title={detalhe ? `ficha · ${detalhe.nome}` : ""} onClose={() => setDetalhe(null)}>
        {detalhe && (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="mono px-2 py-1 rounded-md" style={{ fontSize: "0.66rem", background: "#7aa2ff14", color: "#7aa2ff", border: "1px solid #7aa2ff33" }}>{catLbl(detalhe.categoria)}</span>
              <span className="mono" style={{ fontSize: "0.7rem" }}>{ESTAGIOS[detalhe.estagio].nome} · estágio {detalhe.estagio}</span>
              <button onClick={() => { setDetalhe(null); openEdit(detalhe); }} className="ml-auto mono px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/25 transition-colors" style={{ fontSize: "0.7rem" }}>
                ✎ editar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                ["Segmento", detalhe.segmento || "-"],
                ["Cidade", detalhe.cidade || "-"],
                ["Nota Google", detalhe.nota > 0 ? `★ ${detalhe.nota.toLocaleString("pt-BR")}` : "-"],
                ["Avaliações", detalhe.avaliacoes > 0 ? String(detalhe.avaliacoes) : "-"],
                ["E-mail", detalhe.email || "-"],
                ["WhatsApp", detalhe.whatsapp || detalhe.contato || "-"],
              ].map(([k, v]) => (
                <div key={k} className="bg-white/3 border border-[var(--line)] rounded-xl px-4 py-3">
                  <div className="mono mb-1" style={{ fontSize: "0.68rem" }}>{k}</div>
                  <div className="text-[.86rem] break-words">{v}</div>
                </div>
              ))}
            </div>

            {detalhe.site && (
              <a href={detalhe.site.startsWith("http") ? detalhe.site : `https://${detalhe.site}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-[.88rem] text-[#54b8f0] hover:text-[#8ad0ff] break-all mb-5">
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                {detalhe.site.replace(/^https?:\/\//, "")}
              </a>
            )}

            <AnalisePresenca leadId={detalhe.id} onAtualizada={refresh} />

            <div className="mb-5">
              <div className="mono mb-2" style={{ fontSize: "0.68rem" }}>relatório público</div>
              {(relatorioRes || detalhe.relatorio) && (
                <div className="flex items-center gap-2 mb-3">
                  <a
                    href={relatorioRes ? relatorioRes.url : detalhe.relatorio!}
                    target="_blank" rel="noreferrer"
                    className="text-[.8rem] text-[#54b8f0] hover:text-[#8ad0ff] break-all min-w-0"
                  >
                    {relatorioRes ? relatorioRes.url : detalhe.relatorio}
                  </a>
                  <button
                    onClick={() => copiarRelatorio(relatorioRes ? relatorioRes.url : detalhe.relatorio!)}
                    className="mono shrink-0 px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/25 transition-colors"
                    style={{ fontSize: "0.7rem" }}
                  >
                    {relatorioCopiado ? "copiado ✓" : "copiar"}
                  </button>
                </div>
              )}
              <button
                onClick={() => gerarRelatorio(detalhe)}
                disabled={relatorioBusy}
                className="flex items-center justify-center gap-2 h-[44px] px-4 rounded-xl bg-[#FF4000] hover:bg-[#ff5c22] text-white text-[.82rem] font-medium transition-colors disabled:opacity-60"
              >
                {relatorioBusy ? "gerando e publicando…" : "gerar relatório"}
              </button>
              {relatorioStatus === "entrando" && (
                <p className="mono mt-2" style={{ fontSize: "0.68rem" }}>⏳ entrando no ar (~2 min)</p>
              )}
              {relatorioStatus === "noAr" && (
                <p className="mono mt-2" style={{ fontSize: "0.68rem" }}>✅ no ar</p>
              )}
              {relatorioStatus === "demorado" && (
                <p className="mono mt-2" style={{ fontSize: "0.68rem" }}>ainda publicando, tente o link em instantes</p>
              )}
            </div>

            <div className="mb-5">
              <div className="mono mb-2" style={{ fontSize: "0.68rem" }}>por que é bom lead</div>
              <p className="text-[.86rem] text-[#cacac4] leading-relaxed">{detalhe.porque || "-"}</p>
            </div>

            {detalhe.solucao && (
              <div className="mb-5">
                <div className="mono mb-2" style={{ fontSize: "0.68rem" }}>solução validada</div>
                <p className="text-[.86rem] text-[#3ddc84]">{detalhe.solucao}</p>
              </div>
            )}

            {detalhe.movs.length > 0 && (
              <div className="mb-6">
                <div className="mono mb-3" style={{ fontSize: "0.68rem" }}>movimentações</div>
                <div className="space-y-2.5 border-l border-[var(--line)] pl-4">
                  {detalhe.movs.map((m, i) => (
                    <div key={i} className="relative text-[.8rem] text-[#9a9a95]">
                      <span className="absolute -left-[17px] top-1.5 w-1.5 h-1.5 rounded-full bg-[#FF4000]" />
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {detalhe.estagio <= 2 && (detalhe.whatsapp || detalhe.contato) && (
                <button onClick={() => { setDetalhe(null); openAbordar(detalhe); }}
                  className="flex-1 flex items-center justify-center gap-2 h-[50px] rounded-[14px] bg-[#25d366] hover:bg-[#2ee06f] text-[#04210f] text-[.88rem] font-semibold transition-colors">
                  abordar no WhatsApp
                </button>
              )}
              <button onClick={() => { setDetalhe(null); mover(detalhe, 1); }} disabled={detalhe.estagio >= 5}
                className="flex-1 h-[50px] rounded-[14px] border border-white/12 text-[#cacac4] hover:border-white/28 transition-colors disabled:opacity-40">
                avançar → {detalhe.estagio + 1 < 6 ? ESTAGIOS[detalhe.estagio + 1].nome : "-"}
              </button>
            </div>

            {detalhe.estagio >= 0 && detalhe.estagio <= 2 && detalhe.status !== "arquivado" && (
              <div className="flex gap-3 mt-3">
                <button
                  onClick={async () => { if (await marcarDesfecho(detalhe, "sem-interesse")) setDetalhe(null); }}
                  className="flex-1 h-[44px] rounded-xl border border-[#fb7185]/30 text-[#fb7185] bg-[#fb7185]/8 hover:bg-[#fb7185]/15 text-[.8rem] font-medium transition-colors"
                >
                  sem interesse
                </button>
                <button
                  onClick={async () => { if (await marcarDesfecho(detalhe, "sem-resposta")) setDetalhe(null); }}
                  className="flex-1 h-[44px] rounded-xl border border-white/12 text-[#9a9a95] bg-white/4 hover:text-white hover:border-white/30 text-[.8rem] font-medium transition-colors"
                >
                  sem resposta
                </button>
              </div>
            )}

            {detalhe.estagio === 2 && detalhe.status !== "arquivado" && !detalhe.respondeuEm && (
              <button
                onClick={async () => { await registrarResposta(detalhe); }}
                className="mt-3 w-full h-[44px] rounded-xl border border-white/12 text-[#b8b8b3] hover:text-white hover:border-white/28 text-[.8rem] font-medium transition-colors"
              >
                registrar resposta
              </button>
            )}
          </div>
        )}
      </Modal>
    </MotionConfig>
  );
}