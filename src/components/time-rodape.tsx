"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { AgentAvatar } from "./agent-avatar";
import { AGENTES, CORES } from "./demandas";

type Mensagem = { quando: string; de: string; para?: string; texto: string };
type Data = {
  sala: Mensagem[];
  agentes: Record<string, { ocupado: boolean; demanda?: string }>;
};

const ease = [0.22, 1, 0.36, 1] as const;

export function TimeRodape() {
  const [data, setData] = useState<Data | null>(null);
  const [aberto, setAberto] = useState(false);
  const salaRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/orquestra");
      if (r.status === 401) return;
      const j = await r.json();
      setData({
        sala: Array.isArray(j.sala) ? j.sala : [],
        agentes: j.agentes && typeof j.agentes === "object" ? j.agentes : {},
      });
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (aberto && salaRef.current) salaRef.current.scrollTop = salaRef.current.scrollHeight;
  }, [aberto, data?.sala.length]);

  const trabalhando = data ? AGENTES.filter((a) => data.agentes[a.id]?.ocupado === true).length : 0;
  const logs = data ? data.sala.slice(-10) : [];

  return (
    <div className="mt-8 border-t border-[var(--line)]">
      <button
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="w-full flex items-center gap-3 py-3 text-left"
      >
        <span className="label">Time</span>
        <span className="chip nums">
          {trabalhando} trabalhando
        </span>
        <ChevronUp
          className={`w-4 h-4 ml-auto text-[#6b6b66] transition-transform ${aberto ? "" : "rotate-180"}`}
          strokeWidth={1.8}
        />
      </button>

      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <div className="pb-5 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {AGENTES.map((a) => {
                  const st = data?.agentes[a.id] || { ocupado: false };
                  const cor = CORES[a.id] || "#8a8a85";
                  return (
                    <div
                      key={a.id}
                      className={`rounded-xl border bg-[var(--bg-2)] p-3 transition-colors ${
                        st.ocupado ? "border-[#7aa2ff]/50" : "border-[var(--line)]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <AgentAvatar nome={a.nome} cor={cor} size={34} />
                        <div className="min-w-0">
                          <div className="text-[.82rem] font-medium leading-none truncate">{a.nome}</div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={`w-2 h-2 rounded-full ${st.ocupado ? "bg-[#7aa2ff] animate-pulse" : "bg-[#3ddc84]"}`} />
                            <span className="mono" style={{ fontSize: "0.6rem" }}>
                              {st.ocupado ? "trabalhando" : "disponível"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {st.demanda && (
                        <p className="text-[.68rem] text-[#9a9a95] mt-2 line-clamp-2 leading-snug">{st.demanda}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div>
                <div className="mono mb-3">Logs</div>
                {logs.length === 0 ? (
                  <div className="text-[.8rem] text-[#6b6b66]">Ninguém trabalhando agora.</div>
                ) : (
                  <div ref={salaRef} className="max-h-[260px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                    {logs.map((m, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <AgentAvatar nome={m.de} cor={CORES[m.de] || "#8a8a85"} size={28} />
                        <div className="min-w-0">
                          <div className="text-[.72rem]">
                            <b style={{ color: CORES[m.de] || "#fff" }}>{m.de}</b>{" "}
                            <span className="mono text-[#5d5d58]" style={{ fontSize: "0.62rem" }}>{m.quando}</span>
                          </div>
                          <p className="text-[.82rem] text-[#c4c4c0] leading-relaxed">{m.texto}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
