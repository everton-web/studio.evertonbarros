"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

export type TipoEvento = "tarefa" | "reuniao" | "post" | "vencimento";
export type EventoAgenda = {
  id: string;
  titulo: string;
  quando: string;
  tipo: TipoEvento;
  secao?: "em_andamento" | "aguardando_everton";
};

const TIPO_COR: Record<TipoEvento, string> = {
  tarefa: "#7aa2ff",
  reuniao: "#FF4000",
  post: "#d9a03a",
  vencimento: "#fb7185",
};

const TIPO_LBL: Record<TipoEvento, string> = {
  tarefa: "tarefa",
  reuniao: "reunião",
  post: "post",
  vencimento: "vencimento",
};

const DIAS_CURTOS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const DIAS_LONGOS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function diaDe(quando: string) {
  return (quando || "").slice(0, 10);
}
function horaDe(quando: string): { h: number; m: number } | null {
  const t = (quando || "").match(/T(\d{2}):(\d{2})/);
  if (!t) return null;
  const h = Number(t[1]);
  const m = Number(t[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return { h, m };
}
function inicioSemana(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function Pilula({ e, compacta }: { e: EventoAgenda; compacta?: boolean }) {
  const cor = TIPO_COR[e.tipo];
  const t = horaDe(e.quando);
  return (
    <div
      className="rounded-md px-1.5 py-1 overflow-hidden"
      style={{ background: `${cor}1f`, borderLeft: `2px solid ${cor}` }}
      title={TIPO_LBL[e.tipo]}
    >
      <div className="truncate leading-tight text-[var(--ink-2)]" style={{ fontSize: compacta ? "0.64rem" : "0.76rem" }}>
        {e.titulo}
      </div>
      {t && (
        <div className="mono truncate" style={{ fontSize: "0.56rem" }}>
          {pad(t.h)}:{pad(t.m)}
        </div>
      )}
    </div>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-10 text-center text-[.82rem] text-[#6b6b66]">{children}</div>;
}

function VisaoDia({ eventos, dataRef, agora, vazio }: { eventos: EventoAgenda[]; dataRef: Date; agora: Date; vazio?: string }) {
  const alvo = ymd(dataRef);
  const doDia = eventos.filter((e) => diaDe(e.quando) === alvo);
  const secaoHoje = alvo === ymd(agora);
  const secaoItens = secaoHoje ? doDia.filter((e) => e.secao) : [];
  const naTimeline = doDia.filter((e) => !e.secao);
  const semHora = naTimeline.filter((e) => !horaDe(e.quando));
  const comHora = naTimeline.filter((e) => horaDe(e.quando));

  const HORA_INI = 7;
  const HORA_FIM = 20;
  const ALT = 54;
  const horas: number[] = [];
  for (let h = HORA_INI; h <= HORA_FIM; h++) horas.push(h);

  if (doDia.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-2)]">
        <Vazio>{vazio ?? "Nada agendado para hoje."}</Vazio>
      </div>
    );
  }

  const hoje = ymd(agora) === alvo;
  const ah = agora.getHours();
  const am = agora.getMinutes();
  const mostraAgora = hoje && ah >= HORA_INI && ah <= HORA_FIM;
  const agoraTop = (ah - HORA_INI) * ALT + (am / 60) * ALT;

  const secaoEmAndamento = secaoItens.filter((e) => e.secao === "em_andamento");
  const secaoAguardando = secaoItens.filter((e) => e.secao === "aguardando_everton");

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-2)] overflow-hidden">
      {(secaoEmAndamento.length > 0 || secaoAguardando.length > 0) && (
        <div className="p-3 border-b border-[var(--line)] space-y-3">
          {secaoEmAndamento.length > 0 && (
            <div>
              <div className="mono mb-1.5" style={{ fontSize: "0.58rem" }}>Em andamento</div>
              <div className="space-y-1.5">
                {secaoEmAndamento.map((e) => (
                  <Pilula key={e.id} e={e} />
                ))}
              </div>
            </div>
          )}
          {secaoAguardando.length > 0 && (
            <div>
              <div className="mono mb-1.5" style={{ fontSize: "0.58rem" }}>Esperando você</div>
              <div className="space-y-1.5">
                {secaoAguardando.map((e) => (
                  <Pilula key={e.id} e={e} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {semHora.length > 0 && (
        <div className="p-3 border-b border-[var(--line)] space-y-1.5">
          {semHora.map((e) => (
            <Pilula key={e.id} e={e} />
          ))}
        </div>
      )}
      <div className="relative overflow-y-auto max-h-[58vh] scrollbar-thin">
        <div className="relative" style={{ height: horas.length * ALT }}>
          {horas.map((h, i) => (
            <div key={h} className="absolute left-0 right-0 flex" style={{ top: i * ALT, height: ALT }}>
              <span className="w-14 shrink-0 pl-3 pt-1 mono" style={{ fontSize: "0.6rem" }}>
                {pad(h)}:00
              </span>
              <div className="flex-1 border-t border-[var(--line)]" />
            </div>
          ))}
          {comHora.map((e) => {
            const t = horaDe(e.quando);
            if (!t) return null;
            const top = (t.h - HORA_INI) * ALT + (t.m / 60) * ALT;
            const cor = TIPO_COR[e.tipo];
            return (
              <div
                key={e.id}
                className="absolute left-16 right-3 rounded-lg px-2.5 py-1.5 overflow-hidden"
                style={{ top: Math.max(top, 0), minHeight: 30, background: `${cor}22`, borderLeft: `3px solid ${cor}` }}
              >
                <div className="truncate text-[.76rem] font-medium text-[var(--ink)] leading-tight">{e.titulo}</div>
                <div className="mono truncate" style={{ fontSize: "0.58rem" }}>
                  {pad(t.h)}:{pad(t.m)} · {TIPO_LBL[e.tipo]}
                </div>
              </div>
            );
          })}
          {mostraAgora && (
            <div className="absolute left-14 right-0 flex items-center pointer-events-none" style={{ top: agoraTop }}>
              <span className="w-2 h-2 rounded-full bg-[#FF4000]" />
              <div className="flex-1 h-px bg-[#FF4000]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VisaoSemana({ eventos, dataRef, agora, vazio }: { eventos: EventoAgenda[]; dataRef: Date; agora: Date; vazio?: string }) {
  const ini = inicioSemana(dataRef);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ini);
    d.setDate(ini.getDate() + i);
    return d;
  });
  const algum = dias.some((d) => eventos.some((e) => diaDe(e.quando) === ymd(d)));

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-2)] p-3">
      <div className="grid grid-cols-7 gap-1.5">
        {dias.map((d, i) => {
          const evs = eventos.filter((e) => diaDe(e.quando) === ymd(d));
          const hoje = ymd(d) === ymd(agora);
          return (
            <div
              key={ymd(d)}
              className={`min-w-0 rounded-xl border p-1.5 ${hoje ? "border-[#FF4000]/50 bg-[#FF4000]/6" : "border-[var(--line)]"}`}
            >
              <div className="text-center mb-1.5">
                <div className="mono" style={{ fontSize: "0.56rem" }}>
                  {DIAS_CURTOS[i]}
                </div>
                <div className={`nums text-[.82rem] ${hoje ? "text-[#FF4000] font-semibold" : "text-[var(--ink)]"}`}>
                  {d.getDate()}
                </div>
              </div>
              <div className="space-y-1">
                {evs.map((e) => (
                  <Pilula key={e.id} e={e} compacta />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {!algum && <Vazio>{vazio ?? "Nada agendado nesta semana."}</Vazio>}
    </div>
  );
}

function VisaoMes({ eventos, dataRef, agora, vazio }: { eventos: EventoAgenda[]; dataRef: Date; agora: Date; vazio?: string }) {
  const ini = inicioSemana(new Date(dataRef.getFullYear(), dataRef.getMonth(), 1));
  const celulas = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(ini);
    d.setDate(ini.getDate() + i);
    return d;
  });
  const noMes = (d: Date) => d.getMonth() === dataRef.getMonth() && d.getFullYear() === dataRef.getFullYear();
  const algum = eventos.some((e) => {
    const [y, m] = diaDe(e.quando).split("-").map(Number);
    return y === dataRef.getFullYear() && m - 1 === dataRef.getMonth();
  });

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-2)] p-3">
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {DIAS_CURTOS.map((d) => (
          <div key={d} className="mono text-center" style={{ fontSize: "0.58rem" }}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {celulas.map((d) => {
          const evs = eventos.filter((e) => diaDe(e.quando) === ymd(d));
          const tipos = Array.from(new Set(evs.map((e) => e.tipo)));
          const hoje = ymd(d) === ymd(agora);
          return (
            <div
              key={ymd(d)}
              className={`min-h-[64px] rounded-lg border p-1.5 ${noMes(d) ? "opacity-40" : ""} ${
                hoje ? "border-[#FF4000]/50 bg-[#FF4000]/6" : "border-[var(--line)]"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={`nums text-[.74rem] ${hoje ? "text-[#FF4000] font-semibold" : "text-[var(--ink-2)]"}`}>
                  {d.getDate()}
                </span>
                {evs.length > 0 && (
                  <span className="mono" style={{ fontSize: "0.56rem" }}>
                    {evs.length}
                  </span>
                )}
              </div>
              {tipos.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-1.5">
                  {tipos.map((t) => (
                    <span key={t} className="w-1.5 h-1.5 rounded-full" style={{ background: TIPO_COR[t] }} title={TIPO_LBL[t]} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!algum && <Vazio>{vazio ?? "Nada agendado neste mês."}</Vazio>}
    </div>
  );
}

export function Calendario({
  eventos,
  aoCriarReuniao,
  vazio,
}: {
  eventos: EventoAgenda[];
  aoCriarReuniao?: () => void;
  vazio?: string;
}) {
  const [visao, setVisao] = useState<"dia" | "semana" | "mes">("dia");
  const [dataRef, setDataRef] = useState<Date>(() => new Date());
  const [agora, setAgora] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const mover = (dir: number) => {
    setDataRef((d) => {
      const x = new Date(d);
      if (visao === "dia") x.setDate(x.getDate() + dir);
      else if (visao === "semana") x.setDate(x.getDate() + dir * 7);
      else x.setMonth(x.getMonth() + dir);
      return x;
    });
  };

  const d = dataRef;
  let titulo: string;
  if (visao === "mes") {
    titulo = `${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  } else if (visao === "semana") {
    const ini = inicioSemana(d);
    const fim = new Date(ini);
    fim.setDate(ini.getDate() + 6);
    titulo =
      ini.getMonth() === fim.getMonth()
        ? `${ini.getDate()} a ${fim.getDate()} de ${MESES[ini.getMonth()]}`
        : `${ini.getDate()} de ${MESES[ini.getMonth()]} a ${fim.getDate()} de ${MESES[fim.getMonth()]}`;
  } else {
    titulo = `${DIAS_LONGOS[(d.getDay() + 6) % 7]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
  }

  const segmentos: { id: "dia" | "semana" | "mes"; label: string }[] = [
    { id: "dia", label: "Dia" },
    { id: "semana", label: "Semana" },
    { id: "mes", label: "Mês" },
  ];

  return (
    <div className="space-y-3">
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
        <button
          onClick={() => mover(-1)}
          aria-label="período anterior"
          className="w-9 h-9 grid place-items-center rounded-lg border border-[var(--line)] text-[#8a8a85] hover:text-white hover:border-[var(--line-2)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.8} />
        </button>
        <button
          onClick={() => mover(1)}
          aria-label="próximo período"
          className="w-9 h-9 grid place-items-center rounded-lg border border-[var(--line)] text-[#8a8a85] hover:text-white hover:border-[var(--line-2)] transition-colors"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={1.8} />
        </button>
        <button
          onClick={() => setDataRef(new Date())}
          className="h-9 px-3 rounded-lg border border-[var(--line)] text-[.78rem] text-[#c4c4c0] hover:text-white hover:border-[var(--line-2)] transition-colors"
        >
          Hoje
        </button>
        {aoCriarReuniao && (
          <button
            onClick={aoCriarReuniao}
            className="ml-auto flex items-center gap-2 h-9 px-3.5 rounded-lg bg-[#FF4000] hover:bg-[#ff5c22] text-[var(--accent-ink)] text-[.8rem] font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Nova reunião
          </button>
        )}
      </div>

      <div className="mono" style={{ fontSize: "0.66rem" }}>
        {titulo}
      </div>

      {visao === "dia" && <VisaoDia eventos={eventos} dataRef={dataRef} agora={agora} vazio={vazio} />}
      {visao === "semana" && <VisaoSemana eventos={eventos} dataRef={dataRef} agora={agora} vazio={vazio} />}
      {visao === "mes" && <VisaoMes eventos={eventos} dataRef={dataRef} agora={agora} vazio={vazio} />}
    </div>
  );
}
