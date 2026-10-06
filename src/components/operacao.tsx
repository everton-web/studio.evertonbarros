"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, ListFilter } from "lucide-react";
import { Calendario, type EventoAgenda } from "./calendario";
import { AGENTES, CORES, ST_LBL, ST_COR } from "./demandas";

type Demanda = {
  id: string;
  titulo: string;
  persona: string;
  status: string;
  prazo: string;
  cliente: string;
  projeto: string;
  log: string[];
};

const STATUS_ORDEM = [
  "fila",
  "em_andamento",
  "aguardando_everton",
  "bloqueada",
  "aguardando_cliente",
  "concluida",
  "cancelada",
] as const;

const nomeAgente = (id: string) => AGENTES.find((a) => a.id === id)?.nome || id || "orion";
const corAgente = (id: string) => CORES[id] || "#8a8a85";
function fmtCurto(q: string) {
  const s = (q || "").slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}`;
}
function hojeYmd() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function Operacao() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [visao, setVisao] = useState<"quadro" | "lista" | "calendario">("quadro");
  const [busca, setBusca] = useState("");
  const [novoTexto, setNovoTexto] = useState("");
  const [novaPersona, setNovaPersona] = useState("orion");
  const [novoPrazo, setNovoPrazo] = useState(hojeYmd);
  const [painelNova, setPainelNova] = useState(false);
  const [busy, setBusy] = useState(false);

  const [fStatus, setFStatus] = useState("todos");
  const [fPersona, setFPersona] = useState("todos");
  const [fCliente, setFCliente] = useState("");

  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/orquestra");
      if (r.status === 401) {
        location.href = "/login";
        return;
      }
      const j = await r.json();
      setDemandas(Array.isArray(j.fila) ? j.fila : []);
    } catch {
      /* offline */
    } finally {
      setCarregado(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch("/api/orquestra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } catch {
      /* offline */
    } finally {
      setBusy(false);
    }
  }

  function despachar() {
    if (!novoTexto.trim()) return;
    post({ action: "nova", texto: novoTexto.trim(), atribuido: novaPersona, prazo: novoPrazo }).then(() => {
      setNovoTexto("");
      setNovoPrazo(hojeYmd());
      setPainelNova(false);
    });
  }

  const q = busca.trim().toLowerCase();
  const filtrarBusca = useCallback(
    (d: Demanda) =>
      !q ||
      `${d.titulo} ${d.persona} ${d.cliente} ${d.projeto}`.toLowerCase().includes(q),
    [q],
  );

  const eventosCal: EventoAgenda[] = useMemo(
    () =>
      demandas
        .filter((d) => d.prazo)
        .map((d) => ({ id: d.id, titulo: d.titulo, quando: d.prazo, tipo: "tarefa" as const })),
    [demandas],
  );

  const listaFiltrada = useMemo(
    () =>
      demandas.filter(
        (d) =>
          filtrarBusca(d) &&
          (fStatus === "todos" || d.status === fStatus) &&
          (fPersona === "todos" || d.persona === fPersona) &&
          (!fCliente.trim() || d.cliente.toLowerCase().includes(fCliente.trim().toLowerCase())),
      ),
    [demandas, filtrarBusca, fStatus, fPersona, fCliente],
  );

  const segmentos = [
    { id: "quadro" as const, label: "Quadro" },
    { id: "lista" as const, label: "Lista" },
    { id: "calendario" as const, label: "Calendário" },
  ];

  return (
    <div className="space-y-4">
      {/* cabeçalho de controles */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-[var(--line)] overflow-hidden">
          {segmentos.map((s) => (
            <button
              key={s.id}
              onClick={() => setVisao(s.id)}
              className={`h-9 px-3 text-[.78rem] transition-colors ${
                visao === s.id ? "bg-white/8 text-white" : "text-[#8a8a85] hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-[var(--line)] bg-white/[.02] focus-within:border-[#FF4000]/50 transition-colors min-w-0">
          <Search className="w-3.5 h-3.5 text-[#6b6b66] shrink-0" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="buscar demanda…"
            aria-label="buscar demanda"
            className="bg-transparent outline-none text-[.8rem] w-[150px] sm:w-[200px] placeholder:text-[#6b6b66]"
          />
        </div>

        <button
          onClick={() => setPainelNova((v) => !v)}
          className="ml-auto flex items-center gap-2 h-9 px-3.5 rounded-lg bg-[#FF4000] hover:bg-[#ff5c22] text-[var(--accent-ink)] text-[.8rem] font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2.2} />
          Nova demanda
        </button>
      </div>

      {painelNova && (
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              value={novoTexto}
              onChange={(e) => setNovoTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && despachar()}
              placeholder="ex.: Mia, prepara o case Behance do cliente"
              aria-label="nova demanda"
              className="field-input flex-1"
            />
            <select
              value={novaPersona}
              onChange={(e) => setNovaPersona(e.target.value)}
              aria-label="atribuir a"
              className="h-10 bg-[var(--bg-3)] border border-[var(--line)] rounded-xl px-3 text-[.84rem] outline-none focus:border-[#FF4000]/60"
            >
              {AGENTES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={novoPrazo}
              onChange={(e) => setNovoPrazo(e.target.value)}
              aria-label="prazo"
              className="h-10 bg-[var(--bg-3)] border border-[var(--line)] rounded-xl px-3 text-[.84rem] outline-none focus:border-[#FF4000]/60"
            />
            <button
              onClick={despachar}
              disabled={busy}
              className="h-10 px-5 rounded-xl bg-[#7aa2ff] hover:bg-[#8ab3ff] disabled:opacity-60 text-[var(--accent-ink)] text-[.86rem] font-semibold transition-colors"
            >
              despachar
            </button>
          </div>
        </div>
      )}

      {/* QUADRO */}
      {visao === "quadro" &&
        (demandas.length === 0 ? (
          <div className="card p-8 text-center text-[.84rem] text-[#6b6b66]">Nada aqui: crie a primeira demanda.</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin items-start">
            {STATUS_ORDEM.map((st) => {
              const itens = demandas.filter((d) => d.status === st && filtrarBusca(d));
              return (
                <div
                  key={st}
                  onDragOver={(e: React.DragEvent) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setSobre(st);
                  }}
                  onDragLeave={() => setSobre((v) => (v === st ? null : v))}
                  onDrop={(e: React.DragEvent) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain");
                    setArrastando(null);
                    setSobre(null);
                    if (id) post({ action: "status", id, status: st });
                  }}
                  className={`w-[264px] shrink-0 rounded-2xl border bg-[var(--bg-1)] p-2.5 transition-colors ${
                    sobre === st ? "border-[#FF4000]" : "border-[var(--line)]"
                  }`}
                >
                  <div className="flex items-center justify-between px-1.5 pt-1 pb-2.5">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ST_COR[st] }} />
                      <span className="label truncate">{ST_LBL[st]}</span>
                    </span>
                    <span className="chip nums shrink-0">{String(itens.length).padStart(2, "0")}</span>
                  </div>
                  <div className="space-y-2.5 min-h-[60px]">
                    {itens.map((d) => (
                      <div
                        key={d.id}
                        draggable
                        onDragStart={(e: React.DragEvent) => {
                          e.dataTransfer.setData("text/plain", d.id);
                          e.dataTransfer.effectAllowed = "move";
                          setArrastando(d.id);
                        }}
                        onDragEnd={() => {
                          setArrastando(null);
                          setSobre(null);
                        }}
                        style={{ opacity: arrastando === d.id ? 0.4 : 1 }}
                        className="rounded-xl border border-[var(--line)] bg-[var(--bg-2)] p-3 cursor-grab active:cursor-grabbing hover:border-[var(--line-2)] transition-colors"
                      >
                        <p className="text-[.82rem] leading-snug text-[var(--ink-2)] text-balance">{d.titulo}</p>
                        <div className="flex items-center gap-2 mt-2 mono" style={{ fontSize: "0.62rem" }}>
                          <span style={{ color: corAgente(d.persona) }}>{nomeAgente(d.persona)}</span>
                          {d.prazo && <span className="ml-auto">{fmtCurto(d.prazo)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {/* LISTA */}
      {visao === "lista" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ListFilter className="w-4 h-4 text-[#6b6b66] shrink-0" />
            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              aria-label="filtrar por status"
              className="h-9 bg-[var(--bg-3)] border border-[var(--line)] rounded-lg px-2.5 text-[.78rem] outline-none focus:border-[#FF4000]/60"
            >
              <option value="todos">todos os status</option>
              {STATUS_ORDEM.map((st) => (
                <option key={st} value={st}>{ST_LBL[st]}</option>
              ))}
            </select>
            <select
              value={fPersona}
              onChange={(e) => setFPersona(e.target.value)}
              aria-label="filtrar por persona"
              className="h-9 bg-[var(--bg-3)] border border-[var(--line)] rounded-lg px-2.5 text-[.78rem] outline-none focus:border-[#FF4000]/60"
            >
              <option value="todos">todas as personas</option>
              {AGENTES.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
            <input
              value={fCliente}
              onChange={(e) => setFCliente(e.target.value)}
              placeholder="cliente…"
              aria-label="filtrar por cliente"
              className="h-9 w-[140px] bg-[var(--bg-3)] border border-[var(--line)] rounded-lg px-3 text-[.78rem] outline-none focus:border-[#FF4000]/60 placeholder:text-[#6b6b66]"
            />
          </div>

          {listaFiltrada.length === 0 ? (
            <div className="card p-8 text-center text-[.84rem] text-[#6b6b66]">Nenhuma demanda: a agência está quieta</div>
          ) : (
            <div className="card overflow-hidden">
              <div className="hidden md:grid grid-cols-[2fr_1fr_1.2fr_1fr_.7fr] gap-3 px-5 py-2.5 border-b border-[var(--line)] mono" style={{ fontSize: "0.58rem" }}>
                <span>Demanda</span><span>Persona</span><span>Status</span><span>Cliente</span><span>Prazo</span>
              </div>
              {listaFiltrada.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col md:grid md:grid-cols-[2fr_1fr_1.2fr_1fr_.7fr] md:gap-3 md:items-center gap-2 px-5 py-3 border-b border-[var(--line)] last:border-0"
                >
                  <div className="min-w-0">
                    <div className="text-[.85rem] leading-snug truncate">{d.titulo}</div>
                    <div className="mono md:hidden mt-1" style={{ fontSize: "0.6rem" }}>
                      <span style={{ color: corAgente(d.persona) }}>{nomeAgente(d.persona)}</span>
                      {d.cliente ? ` · ${d.cliente}` : ""}
                      {d.prazo ? ` · ${fmtCurto(d.prazo)}` : ""}
                    </div>
                  </div>
                  <span className="hidden md:block mono truncate" style={{ fontSize: "0.68rem", color: corAgente(d.persona) }}>
                    {nomeAgente(d.persona)}
                  </span>
                  <select
                    value={d.status}
                    onChange={(e) => e.target.value !== d.status && post({ action: "status", id: d.id, status: e.target.value })}
                    aria-label="mudar status"
                    className="h-10 md:h-9 bg-[var(--bg-3)] border border-[var(--line)] rounded-lg px-2.5 text-[.78rem] outline-none focus:border-[#FF4000]/60"
                    style={{ color: ST_COR[d.status] }}
                  >
                    {STATUS_ORDEM.map((st) => (
                      <option key={st} value={st}>{ST_LBL[st]}</option>
                    ))}
                  </select>
                  <span className="hidden md:block text-[.8rem] text-[#9a9a95] truncate">{d.cliente || "-"}</span>
                  <span className="hidden md:block nums text-[.78rem] text-[#9a9a95]">{d.prazo ? fmtCurto(d.prazo) : "-"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CALENDÁRIO */}
      {visao === "calendario" && (carregado ? <Calendario eventos={eventosCal} vazio="Nada com prazo neste período." /> : null)}
    </div>
  );
}
