"use client";

import { useEffect, useState } from "react";

type Campanha = {
  id: string; nome: string; canal: string; investimento: number;
  cliques: number; conversoes: number; status: string; criada: string;
};
type Pixel = { n: number; primeiro: string; ultimo: string };

const CANAIS: [string, string, string][] = [
  ["meta", "Meta/Instagram", "#54b8f0"],
  ["google", "Google Ads", "#d9a03a"],
  ["tiktok", "TikTok", "#a86ff0"],
  ["outro", "Outro", "#8a8a85"],
];
const canais = (c: string) => CANAIS.find(([k]) => k === c) || CANAIS[3];

const fmt = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");
const pct = (a: number, b: number) => (b > 0 ? ((a / b) * 100).toFixed(1).replace(".", ",") + "%" : "-");

export function Analytics({ sites, leads, siteAlvo }: {
  sites: Record<string, Pixel>; leads: {
    estagio: number; status: string; categoria: string; nome: string;
  }[]; siteAlvo: string;
}) {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [load, setLoad] = useState(false);
  const [f, setF] = useState({ nome: "", canal: "meta", investimento: "", cliques: "", conversoes: "0" });
  const [busy, setBusy] = useState(false);

  const carregar = async () => {
    try {
      const r = await fetch("/api/analytics");
      setCampanhas((await r.json()).campanhas || []);
    } catch { /* offline */ }
  };
  useEffect(() => { carregar(); }, [load]);

  async function salvar() {
    if (!f.nome.trim()) { alert("Nome da campanha"); return; }
    setBusy(true);
    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", ...f, investimento: Number(String(f.investimento).replace(",", ".")) || 0, cliques: Number(f.cliques) || 0, conversoes: Number(f.conversoes) || 0 }),
      });
      setF({ nome: "", canal: "meta", investimento: "", cliques: "", conversoes: "0" });
      setLoad((v) => !v);
    } finally { setBusy(false); }
  }
  const set = async (action: string, c: Campanha) => {
    await fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id: c.id, status: c.status }) });
    setLoad((v) => !v);
  };

  // funil real: visitas (pixel) → leads → aprovados → entregues
  const visitas = Object.values(sites).reduce((a: number, p) => a + p.n, 0);
  const me = sites[siteAlvo];
  const leadsSite = leads.filter((l) => l.categoria === "site" || l.categoria === "whatsapp").length;
  const aprovados = leads.filter((l) => l.estagio >= 1 && l.status !== "arquivado").length;
  const entregues = leads.filter((l) => l.estagio === 5 && l.status !== "arquivado").length;
  const totalCampanhas = campanhas.reduce((a, c) => a + c.conversoes, 0);
  const totalInv = campanhas.reduce((a, c) => a + c.investimento, 0);
  const cpl = totalInv > 0 && totalCampanhas > 0 ? totalInv / totalCampanhas : null;
  const ticket = 1997; // ticket médio (LP)

  const funil = [
    [visitas, "visitas (pixel)", "#54b8f0"],
    [leadsSite, "leads do site", "#FF4000"],
    [aprovados, "aprovados", "#d9a03a"],
    [entregues, "entregues", "#3ddc84"],
  ] as const;

  return (
    <div className="space-y-6">
      {/* hero de receita (referência: card grande + KPIs) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-[var(--bg-2)] border border-[#d9a03a]/20 rounded-2xl p-7 lg:col-span-2 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="mono" style={{ fontSize: "0.66rem", color: "#d9a03a" }}>receita potencial (tráfego pago)</span>
            <span className="mono" style={{ fontSize: "0.68rem" }}>ticket médio R$ 1.997</span>
          </div>
          <div className="nums text-[clamp(2.2rem,5vw,3.2rem)] leading-none font-semibold tabular-nums">
            {fmt(totalCampanhas * ticket)}
          </div>
          <p className="text-[.82rem] text-[#9a9a95] mt-2">
            {totalCampanhas} conversão(ões) registrada(s) × ticket: se cada uma virar projeto.
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-2 mt-5">
            <div><div className="mono" style={{ fontSize: "0.66rem" }}>conversões</div><div className="nums text-[1.15rem] font-semibold">{totalCampanhas}</div></div>
            <div><div className="mono" style={{ fontSize: "0.66rem" }}>CPL médio</div><div className="nums text-[1.15rem] font-semibold">{cpl ? fmt(cpl) : "-"}</div></div>
            <div><div className="mono" style={{ fontSize: "0.66rem" }}>ROI</div><div className="nums text-[1.15rem] font-semibold text-[#3ddc84]">{totalInv > 0 ? `${(((totalCampanhas * ticket) / totalInv) * 100).toFixed(0)}%` : "-"}</div></div>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="bg-[var(--bg-2)] border border-[var(--line)] rounded-2xl p-6">
            <div className="mono mb-2" style={{ fontSize: "0.66rem" }}>investido</div>
            <div className="nums text-[1.5rem] leading-none font-semibold text-[#FF4000]">{fmt(totalInv)}</div>
          </div>
          <div className="bg-[var(--bg-2)] border border-[var(--line)] rounded-2xl p-6">
            <div className="mono mb-2" style={{ fontSize: "0.66rem" }}>para retorno</div>
            <div className="nums text-[1.5rem] leading-none font-semibold">{fmt(Math.max(0, totalCampanhas * ticket - totalInv))}</div>
            <div className="mono mt-2" style={{ fontSize: "0.66rem" }}>lucro potencial sobre o investido</div>
          </div>
        </div>
      </div>

      {/* funil real do tráfego */}
      <div className="card p-6">
        <div className="mono mb-1" style={{ fontSize: "0.66rem" }}>funil · do clique ao cliente</div>
        <p className="text-[.8rem] text-[#8a8a85] mb-5">visitas reais do pixel + leads + aprovações + entregas</p>
        <div className="space-y-3">
          {funil.map(([n, lbl, cor]) => (
            <div key={lbl} className="flex items-center gap-3">
              <span className="w-36 text-[.74rem] text-[#9a9a95] shrink-0">{lbl}</span>
              <div className="flex-1 h-7 rounded-lg bg-white/4 overflow-hidden">
                <div className="nums h-full rounded-lg flex items-center px-3 text-[.8rem] font-semibold text-[var(--accent-ink)] transition-all"
                  style={{ width: `${Math.max(n > 0 ? 4 : 0, (n / Math.max(1, visitas)) * 100)}%`, background: cor }}>
                  {n}
                </div>
              </div>
              <span className="nums w-16 text-[.74rem] text-[#b8b8b3] shrink-0 text-right">{pct(n, visitas)}</span>
            </div>
          ))}
        </div>
        <div className="mono mt-5" style={{ fontSize: "0.68rem" }}>
          conversão visita→lead no site: <b className="text-[#f7f7f5]">{pct(leadsSite, me?.n || 1)}</b>
        </div>
      </div>

      {/* campanhas */}
      <div className="card p-6">
        <div className="mono mb-5" style={{ fontSize: "0.66rem" }}>campanhas de tráfego pago</div>
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-4">
          <label className="block sm:col-span-2">
            <span className="mono block mb-2" style={{ fontSize: "0.68rem" }}>Nome</span>
            <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} id="campanha-nome" placeholder="ex.: Meta · Odonto Salvador" className="w-full h-[48px] bg-white/3 border border-[var(--line)] rounded-xl px-4 text-[.9rem] outline-none focus:border-[#FF4000]/70 transition-colors placeholder:text-[#5d5d58]" />
          </label>
          <label className="block">
            <span className="mono block mb-2" style={{ fontSize: "0.68rem" }}>Canal</span>
            <select value={f.canal} onChange={(e) => setF({ ...f, canal: e.target.value })} className="w-full h-[48px] bg-[#141416] border border-[var(--line)] rounded-xl px-3 text-[.9rem] text-[#f7f7f5] outline-none focus:border-[#FF4000]/70">
              {CANAIS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mono block mb-2" style={{ fontSize: "0.68rem" }}>Invest. (R$)</span>
            <input value={f.investimento} onChange={(e) => setF({ ...f, investimento: e.target.value })} inputMode="decimal" placeholder="300" className="w-full h-[48px] bg-white/3 border border-[var(--line)] rounded-xl px-4 text-[.9rem] outline-none focus:border-[#FF4000]/70 transition-colors placeholder:text-[#5d5d58]" />
          </label>
          <label className="block">
            <span className="mono block mb-2" style={{ fontSize: "0.68rem" }}>Cliques</span>
            <input value={f.cliques} onChange={(e) => setF({ ...f, cliques: e.target.value })} inputMode="numeric" placeholder="0" className="w-full h-[48px] bg-white/3 border border-[var(--line)] rounded-xl px-4 text-[.9rem] outline-none focus:border-[#FF4000]/70 transition-colors placeholder:text-[#5d5d58]" />
          </label>
          <label className="block">
            <span className="mono block mb-2" style={{ fontSize: "0.68rem" }}>Conversões</span>
            <input value={f.conversoes} onChange={(e) => setF({ ...f, conversoes: e.target.value })} inputMode="numeric" placeholder="0" className="w-full h-[48px] bg-white/3 border border-[var(--line)] rounded-xl px-4 text-[.9rem] outline-none focus:border-[#FF4000]/70 transition-colors placeholder:text-[#5d5d58]" />
          </label>
        </div>
        <button onClick={salvar} disabled={busy} className="h-[48px] px-6 rounded-[14px] bg-[#FF4000] hover:bg-[#ff5c22] disabled:opacity-60 text-[var(--accent-ink)] text-[.88rem] font-semibold transition-colors">
          {busy ? "salvando…" : "+ adicionar campanha"}
        </button>

        {/* tabela */}
        {campanhas.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left" style={{ minWidth: 560 }}>
              <thead>
                <tr className="mono" style={{ fontSize: "0.7rem", color: "#9a9a95" }}>
                  <th className="pb-3 pr-4">Campanha</th>
                  <th className="pb-3 pr-4">CTR</th>
                  <th className="pb-3 pr-4">CPL</th>
                  <th className="pb-3 pr-4">Invest.</th>
                  <th className="pb-3 pr-4">Conv.</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {campanhas.map((c) => {
                  const [, cl] = canais(c.canal);
                  const ctr = c.cliques && c.cliques > 0 && c.conversoes > 0 ? ((c.conversoes / c.cliques) * 100).toFixed(1) : "-";
                  const cplC = c.conversoes > 0 && c.investimento > 0 ? c.investimento / c.conversoes : null;
                  return (
                    <tr key={c.id} className="border-t border-[var(--line)]">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.status === "ativa" ? "#3ddc84" : "#8a8a85" }} />
                          <span className="text-[.86rem]">{c.nome}</span>
                          <span className="mono px-1.5 py-0.5 rounded" style={{ fontSize: "0.68rem", color: cl, background: cl + "14" }}>{c.canal}</span>
                        </div>
                      </td>
                      <td className="nums py-3 pr-4 text-[.82rem]">{ctr}%</td>
                      <td className="nums py-3 pr-4 text-[.82rem]">{cplC ? fmt(cplC) : "-"}</td>
                      <td className="nums py-3 pr-4 text-[.82rem]">{fmt(c.investimento)}</td>
                      <td className="nums py-3 pr-4 text-[.82rem] text-[#3ddc84]">{c.conversoes}</td>
                      <td className="py-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => set("update-status", { ...c, status: c.status === "ativa" ? "pausada" : "ativa" })}
                            className="mono px-2 py-1.5 rounded-md border border-white/10 hover:border-white/25 transition-colors" style={{ fontSize: "0.68rem" }}>
                            {c.status === "ativa" ? "pausar" : "ativar"}
                          </button>
                          <button onClick={() => set("delete", c)} aria-label="excluir campanha" className="px-2 py-1.5 rounded-md border border-[#fb7185]/30 text-[#fb7185] hover:bg-[#fb7185]/8 transition-colors" style={{ fontSize: "0.68rem" }}>×</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {campanhas.length === 0 && (
            <button onClick={() => document.getElementById("campanha-nome")?.focus()} className="mt-5 flex items-center gap-2 btn-ghost !h-[40px] !text-[.82rem]">
              + criar primeira campanha (acompanha CPL e ROI)
            </button>
          )}
      </div>

      {/* roteiro */}
      <div className="card p-5">
        <div className="mono mb-3" style={{ fontSize: "0.66rem" }}>próximos passos do módulo</div>
        <ul className="space-y-2 text-[.82rem] text-[#b8b8b3]">
          <li>→ <b className="text-[#f7f7f5]">Importação automática</b> de custo/cliques via API do Meta/Google Ads</li>
          <li>→ <b className="text-[#f7f7f5]">UTMs por campanha</b>: o lead já nasce com a origem exata (categoria + campanha)</li>
          <li>→ <b className="text-[#f7f7f5]">Conversão de verdade</b>: contrato fechado ligado à campanha → ROI real, não estimado</li>
        </ul>
      </div>
    </div>
  );
}