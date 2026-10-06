"use client";

import { useEffect, useRef, useState } from "react";
import { AgentAvatar } from "./agent-avatar";

type Demanda = {
  id: string; titulo: string; persona: string; status: string;
  criada_em: string; iniciada_em: string; concluida_em: string;
  prazo: string; briefing: string; origem: string; log: string[];
};
type Mensagem = { quando: string; de: string; para?: string; texto: string };
type Data = { fila: Demanda[]; sala: Mensagem[]; agentes: Record<string, { ocupado: boolean; demanda?: string }> };

export const CORES: Record<string, string> = {
  caio: "#FF4000", davi: "#a86ff0", theo: "#54b8f0", mia: "#3ddc84", orquestra: "#7aa2ff",
  orion: "#7aa2ff", lia: "#e879a8", fabio: "#e0b84a", olga: "#59c2a6", "davi-copy": "#a86ff0",
};
export const ST_LBL: Record<string, string> = {
  fila: "na fila",
  em_andamento: "em andamento",
  aguardando_everton: "Aguardando você",
  bloqueada: "bloqueada",
  aguardando_cliente: "aguardando cliente",
  concluida: "concluída",
  cancelada: "cancelada",
};
export const ST_COR: Record<string, string> = {
  fila: "#d9a03a",
  em_andamento: "#7aa2ff",
  aguardando_everton: "#FF4000",
  bloqueada: "#fb7185",
  aguardando_cliente: "#f59e0b",
  concluida: "#3ddc84",
  cancelada: "#8a8a85",
};
export const AGENTES = [
  { id: "orquestra", nome: "Orquestra", desc: "despacha e decide" },
  { id: "caio", nome: "Caio", desc: "comercial" },
  { id: "davi", nome: "Davi", desc: "design / UI" },
  { id: "theo", nome: "Theo", desc: "dev / deploy" },
  { id: "mia", nome: "Mia", desc: "conteúdo / portfólio" },
  { id: "davi-copy", nome: "Redator", desc: "copy / revisão" },
  { id: "lia", nome: "Lia", desc: "produto / stories" },
  { id: "olga", nome: "Olga", desc: "operações" },
  { id: "fabio", nome: "Fábio", desc: "financeiro" },
  { id: "orion", nome: "Orion", desc: "orquestra e revisa" },
];

function fmt(iso: string): string {
  if (!iso) return "";
  if (/T00:00:00\.000Z$/.test(iso)) {
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}`;
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function opcoes(persona: string) {
  const found = AGENTES.find((a) => a.id === persona);
  if (found || !persona) return AGENTES;
  return [{ id: persona, nome: persona, desc: "" }, ...AGENTES];
}


export function Demandas({ agentes }: { agentes?: { nome: string; departamento: string; comando: string; html: string }[] }) {
  const [data, setData] = useState<Data | null>(null);
  const [texto, setTexto] = useState("");
  const [atr, setAtr] = useState("orquestra");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const salaRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch("/api/orquestra");
      if (r.status === 401) { location.href = "/login"; return; }
      setData(await r.json());
    } catch { /* offline */ }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 8000); // os agentes "trabalhando" atualizam sozinhos
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (salaRef.current) salaRef.current.scrollTop = salaRef.current.scrollHeight; }, [data?.sala?.length]);

  const post = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      const r = await fetch("/api/orquestra", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const j = await r.json();
      if (!j.ok) alert(j.error || "erro");
      await load();
      return j;
    } finally { setBusy(false); }
  };

  const nova = () => {
    if (!texto.trim()) return;
    post("nova", { texto: texto.trim(), atribuido: atr }).then(() => setTexto(""));
  };
  const enviarSala = () => {
    if (!msg.trim()) return;
    post("sala", { de: "everton", texto: msg.trim() }).then(() => setMsg(""));
  };

  if (!data) return <div className="text-[.85rem] text-[#8a8a85]">carregando a agência…</div>;

  return (
    <div className="space-y-6">
      {/* espaços dos agentes · quem está trabalhando */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {AGENTES.map((a) => {
          const st = data.agentes[a.id] || { ocupado: false };
          const cor = CORES[a.id] || "#8a8a85";
          return (
            <div key={a.id} className={`bg-[var(--bg-2)] border rounded-2xl p-5 transition-colors ${st.ocupado ? "border-[#7aa2ff]/50" : "border-[var(--line)]"}`}>
              <div className="flex items-center gap-3 mb-2.5">
                <AgentAvatar nome={a.nome} cor={cor} size={40} />
                <div className="min-w-0">
                  <div className="text-[.9rem] font-medium leading-none truncate">{a.nome}</div>
                  <div className="mono mt-1" style={{ fontSize: "0.68rem" }}>{a.desc}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${st.ocupado ? "bg-[#7aa2ff] animate-pulse" : "bg-[#3ddc84]"}`} />
                <span className="mono" style={{ fontSize: "0.68rem" }}>{st.ocupado ? "trabalhando" : "disponível"}</span>
              </div>
              {st.demanda && <p className="text-[.7rem] text-[#9a9a95] mt-2 line-clamp-2">{st.demanda}</p>}
            </div>
          );
        })}
      </div>

      {/* cria demanda */}
      <div className="card p-5">
        <div className="mono mb-3" style={{ fontSize: "0.66rem" }}>nova demanda → orquestra escolhe quem ajuda</div>
        <div className="flex flex-col md:flex-row gap-3">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nova()}
            placeholder="ex.: Mia, prepara o case Behance da Multibela" aria-label="nova demanda"
            className="flex-1 h-[50px] bg-white/3 border border-[var(--line)] rounded-xl px-4 text-[.92rem] outline-none focus:border-[#7aa2ff]/60 placeholder:text-[#5d5d58]" />
          <select value={atr} onChange={(e) => setAtr(e.target.value)} aria-label="atribuir a"
            className="h-[50px] bg-[#141416] border border-[var(--line)] rounded-xl px-3 text-[.85rem] outline-none focus:border-[#7aa2ff]/60">
            {AGENTES.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <button onClick={nova} disabled={busy} className="h-[50px] px-6 rounded-[14px] bg-[#7aa2ff] hover:bg-[#8ab3ff] disabled:opacity-60 text-[var(--accent-ink)] text-[.88rem] font-semibold transition-colors">
            despachar
          </button>
        </div>
      </div>

      {/* fila de demandas */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="mono" style={{ fontSize: "0.66rem" }}>demandas</div>
          <span className="mono" style={{ fontSize: "0.68rem" }}>{data.fila.length} na agência</span>
        </div>
        <div className="space-y-2">
          {data.fila.length === 0 && <div className="text-[.8rem] italic text-[#5d5d58]">nenhuma demanda: a agência está quieta</div>}
          {data.fila.map((d) => {
            const emAndamento = d.status === "em_andamento";
            const concluida = d.status === "concluida";
            return (
              <div key={d.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/3 border border-[var(--line)]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ST_COR[d.status] || "#8a8a85" }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[.85rem] truncate">{d.titulo}</div>
                  <div className="mono mt-0.5" style={{ fontSize: "0.66rem" }}>
                    para <b style={{ color: CORES[d.persona || "orquestra"] || "#cacac4" }}>{AGENTES.find((a) => a.id === (d.persona || "orquestra"))?.nome || d.persona}</b> · {ST_LBL[d.status] || d.status} · {fmt(d.criada_em)}
                  </div>
                  {d.briefing && (
                    <div className="mono mt-0.5 truncate" title={d.briefing} style={{ fontSize: "0.66rem", color: "#5d5d58" }}>{d.briefing}</div>
                  )}
                </div>
                <select value={d.persona || ""} disabled={emAndamento}
                  onChange={(e) => e.target.value && post("atribuir", { id: d.id, agente: e.target.value })}
                  aria-label="re-atribuir" className="shrink-0 h-[36px] bg-[#141416] border border-[var(--line)] rounded-lg px-2 text-[.78rem] outline-none disabled:opacity-50">
                  {opcoes(d.persona).map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
                <button onClick={() => post("atribuir", { id: d.id, status: concluida ? "fila" : "concluida" })} title="concluir/reabrir" aria-label="concluir/reabrir"
                  className="shrink-0 w-9 h-9 rounded-lg border border-white/10 hover:border-white/25 transition-colors" style={{ color: concluida ? "#3ddc84" : "#8a8a85" }}>
                  {concluida ? "↺" : "✓"}
                </button>
                <button onClick={() => post("remover", { id: d.id })} title="cancelar" aria-label="cancelar"
                  className="shrink-0 w-9 h-9 rounded-lg border border-white/10 text-[#8a8a85] hover:border-[#fb7185]/40 hover:text-[#fb7185] transition-colors">×</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* sala de reunião */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="mono" style={{ fontSize: "0.66rem" }}>sala de reunião</div>
          <span className="mono" style={{ fontSize: "0.68rem" }}>agentes se encontram aqui</span>
        </div>
        <div ref={salaRef} className="max-h-[320px] overflow-y-auto space-y-2 pr-1 scrollbar-thin" aria-live="polite">
          {data.sala.length === 0 && <div className="text-[.8rem] italic text-[#5d5d58]">sala vazia: envie o 1º assunto</div>}
          {data.sala.map((m, i) => (
            <div key={i} className="flex gap-3 items-start">
              <AgentAvatar nome={m.de} cor={CORES[m.de] || "#8a8a85"} size={30} />
              <div className="min-w-0">
                <div className="text-[.72rem]"><b style={{ color: CORES[m.de] || "#fff" }}>{m.de}</b> <span className="mono text-[#5d5d58]" style={{ fontSize: "0.66rem" }}>{m.quando}</span></div>
                <p className="text-[.84rem] text-[#cacac4] leading-relaxed">{m.texto}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-4">
          <input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviarSala()}
            placeholder="Assunto para a sala… (será atribuído como demanda?)" aria-label="mensagem da sala"
            className="flex-1 h-[48px] bg-white/3 border border-[var(--line)] rounded-xl px-4 text-[.9rem] outline-none focus:border-[#06b6d4]/60 placeholder:text-[#5d5d58]" />
          <button onClick={enviarSala} disabled={busy} className="h-[48px] px-5 rounded-xl bg-[#06b6d4] hover:bg-[#22c8e5] disabled:opacity-60 text-[#04181d] text-[.86rem] font-semibold transition-colors">
            mandar
          </button>
        </div>
      </div>
    </div>
  );
}
