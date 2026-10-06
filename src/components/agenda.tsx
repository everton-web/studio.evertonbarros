"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Calendario, type EventoAgenda } from "./calendario";

type Reuniao = {
  id: string;
  titulo: string;
  quando: string;
  duracao: number;
  participante: string;
  criada_em: string;
};
type Demanda = { id: string; titulo: string; prazo: string; persona: string; status: string };

const ease = [0.22, 1, 0.36, 1] as const;

function defaultQuando() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
}

export function Agenda() {
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [quando, setQuando] = useState(defaultQuando);
  const [duracao, setDuracao] = useState("30");
  const [participante, setParticipante] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ra, ro] = await Promise.all([fetch("/api/agenda"), fetch("/api/orquestra")]);
      if ([ra, ro].some((r) => r.status === 401)) {
        location.href = "/login";
        return;
      }
      const [ja, jo] = await Promise.all([ra.json(), ro.json()]);
      setReunioes(Array.isArray(ja.reunioes) ? ja.reunioes : []);
      setDemandas(Array.isArray(jo.fila) ? jo.fila : []);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto]);

  const hoje = (() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  })();
  const comPrazo = demandas.filter((d) => d.prazo);
  const idsComPrazoHoje = new Set(comPrazo.filter((d) => d.prazo.slice(0, 10) === hoje).map((d) => d.id));
  const secaoHoje = demandas.filter(
    (d) => (d.status === "em_andamento" || d.status === "aguardando_everton") && !idsComPrazoHoje.has(d.id),
  );

  const eventos: EventoAgenda[] = [
    ...reunioes.map((r) => ({ id: r.id, titulo: r.titulo, quando: r.quando, tipo: "reuniao" as const })),
    ...comPrazo.map((d) => ({ id: d.id, titulo: d.titulo, quando: d.prazo, tipo: "tarefa" as const })),
    ...secaoHoje.map((d) => ({
      id: d.id,
      titulo: d.titulo,
      quando: hoje,
      tipo: "tarefa" as const,
      secao: d.status === "em_andamento" ? ("em_andamento" as const) : ("aguardando_everton" as const),
    })),
  ];

  function abrirModal() {
    setTitulo("");
    setQuando(defaultQuando());
    setDuracao("30");
    setParticipante("");
    setErro("");
    setAberto(true);
  }

  async function salvar() {
    setErro("");
    if (!titulo.trim()) {
      setErro("Dê um título para a reunião.");
      return;
    }
    if (!quando) {
      setErro("Escolha a data e o horário.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          quando,
          duracao: Number(duracao) || 30,
          participante: participante.trim(),
        }),
      });
      const j = await r.json();
      if (!j.ok) {
        setErro(j.error || "Não foi possível salvar.");
        return;
      }
      setAberto(false);
      await load();
    } catch {
      setErro("Falha de rede.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Calendario eventos={eventos} aoCriarReuniao={abrirModal} />

      <AnimatePresence>
        {aberto && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAberto(false)}
            />
            <motion.div
              className="fixed z-50 inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[420px] rounded-2xl border border-[var(--line)] bg-[var(--bg-2)] p-5"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.28, ease }}
              role="dialog"
              aria-label="nova reunião"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[1.05rem] font-semibold tracking-[-.02em]">Nova reunião</h3>
                <button
                  onClick={() => setAberto(false)}
                  aria-label="fechar"
                  className="w-9 h-9 grid place-items-center rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-white hover:border-[var(--line-2)] transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={1.9} />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="mono block mb-1.5" style={{ fontSize: "0.64rem" }}>Título</span>
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="ex.: call com o cliente"
                    className="field-input"
                  />
                </label>
                <label className="block">
                  <span className="mono block mb-1.5" style={{ fontSize: "0.64rem" }}>Quando</span>
                  <input
                    type="datetime-local"
                    value={quando}
                    onChange={(e) => setQuando(e.target.value)}
                    className="field-input"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mono block mb-1.5" style={{ fontSize: "0.64rem" }}>Duração (min)</span>
                    <input
                      value={duracao}
                      onChange={(e) => setDuracao(e.target.value)}
                      inputMode="numeric"
                      className="field-input"
                    />
                  </label>
                  <label className="block">
                    <span className="mono block mb-1.5" style={{ fontSize: "0.64rem" }}>Participante</span>
                    <input
                      value={participante}
                      onChange={(e) => setParticipante(e.target.value)}
                      placeholder="opcional"
                      className="field-input"
                    />
                  </label>
                </div>
                {erro && <p className="text-[.78rem] text-[#fb7185]">{erro}</p>}
                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={salvar}
                    disabled={busy}
                    className="flex-1 h-11 rounded-xl bg-[#FF4000] hover:bg-[#ff5c22] disabled:opacity-60 text-[var(--accent-ink)] text-[.86rem] font-semibold transition-colors"
                  >
                    {busy ? "salvando…" : "salvar"}
                  </button>
                  <button
                    onClick={() => setAberto(false)}
                    className="h-11 px-5 rounded-xl border border-[var(--line-2)] text-[#c4c4c0] hover:text-white text-[.86rem] transition-colors"
                  >
                    cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
