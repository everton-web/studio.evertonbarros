"use client";

import { useState } from "react";

export type RastreamentoData = {
  sites: Record<string, { n: number; primeiro: string; ultimo: string }>;
  total: number;
};

const code = (s: string) => (
  <code className="text-[.78rem] text-[#54b8f0] bg-[#54b8f0]/8 border border-[#54b8f0]/15 rounded-lg px-3 py-2 block overflow-x-auto whitespace-pre font-mono">
    {s}
  </code>
);

const snippet = (site: string) => `<!-- Marca Digital · pixel de rastreamento (instalar antes de </head>) -->
<script>
  fetch("https://app.evertonbrito.com/api/t?site=${site}", { mode: "no-cors" }).catch(() => {});
</script>`;

export function Rastreamento({ data, site }: { data: RastreamentoData; site: string }) {
  const sites = Object.entries(data.sites).sort((a, b) => b[1].n - a[1].n);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (k: string, v: string) => {
    try { await navigator.clipboard.writeText(v); } catch { /* sem clipboard */ }
    setCopied(k);
    setTimeout(() => setCopied(null), 1600);
  };

  const me = data.sites[site];

  return (
    <div className="space-y-6">
      {/* status do site alvo */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-6">
          <div className="mono mb-3" style={{ fontSize: "0.66rem" }}>pixel instalado?</div>
          <div className={`text-[1.5rem] font-medium tracking-[-.02em] ${me ? "text-[#3ddc84]" : "text-[#8a8a85]"}`}>
            {me ? "ativo no ar" : "ainda não"}
          </div>
          <p className="text-[.78rem] text-[#8a8a85] mt-1.5">
            {me ? `primeiro hit ${me.primeiro}` : "instale o trecho abaixo no site"}
          </p>
        </div>
        <div className="card p-6">
          <div className="mono mb-3" style={{ fontSize: "0.66rem" }}>visualizações</div>
          <div className="text-[1.5rem] font-medium tracking-[-.02em] tabular-nums">{me?.n ?? 0}</div>
          <p className="text-[.78rem] text-[#8a8a85] mt-1.5">pageviews registrados neste site</p>
        </div>
        <div className="card p-6">
          <div className="mono mb-3" style={{ fontSize: "0.66rem" }}>todos os sites</div>
          <div className="text-[1.5rem] font-medium tracking-[-.02em] tabular-nums">{data.total}</div>
          <p className="text-[.78rem] text-[#8a8a85] mt-1.5">{sites.length} site(s) com pixel ativo</p>
        </div>
      </div>

      {/* trecho de instalação */}
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="text-[1rem] font-medium tracking-[-.01em]">Pixel do evertonbrito.com</div>
          <button
            onClick={() => copy("px", snippet(site))}
            className="h-[42px] px-4 rounded-xl bg-[#FF4000] hover:bg-[#ff5c22] text-white text-[.8rem] font-medium transition-colors"
          >
            {copied === "px" ? "copiado ✓" : "copiar trecho"}
          </button>
        </div>
        <p className="text-[.8rem] text-[#b8b8b3] mb-4">
          Cola antes da tag <code className="text-[#54b8f0]">&lt;/head&gt;</code> do site (no Next: dentro de <code className="text-[#54b8f0]">layout.tsx</code> → <code className="text-[#54b8f0]">&lt;head&gt;</code> com <code className="text-[#54b8f0]">dangerouslySetInnerHTML</code>, ou via <code className="text-[#54b8f0]">next/script</code>).
        </p>
        {code(snippet(site))}
      </div>

      {/* painel por site */}
      <div className="card p-6">
        <div className="mono mb-4" style={{ fontSize: "0.66rem" }}>hits por site</div>
        {sites.length === 0 && <div className="text-[.8rem] italic text-[#5d5d58]">nenhum hit ainda: instale o pixel e visite o site</div>}
        <div className="space-y-0">
          {sites.map(([s, h]) => (
            <div key={s} className="flex items-center gap-4 py-3 border-b border-[var(--line)] last:border-0">
              <span className="font-mono text-[.72rem] text-[#b8b8b3] w-40 truncate">{s}</span>
              <div className="flex-1 h-[6px] rounded-full bg-white/6 overflow-hidden">
                <div className="h-full rounded-full bg-[#FF4000]" style={{ width: `${Math.max(4, Math.round((h.n / Math.max(1, sites[0][1].n)) * 100))}%` }} />
              </div>
              <span className="mono tabular-nums shrink-0" style={{ fontSize: "0.66rem" }}>{h.n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Clarity instalado */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-3 justify-between mb-2">
          <div className="text-[1rem] font-medium tracking-[-.01em]">Microsoft Clarity</div>
          <span className="mono px-2.5 py-1.5 rounded-lg bg-[#3ddc84]/10 border border-[#3ddc84]/25 text-[#3ddc84]" style={{ fontSize: "0.66rem" }}>instalado · ynkvl1zisv</span>
        </div>
        <p className="text-[.8rem] text-[#b8b8b3] mb-4">
          Script no <code className="text-[#54b8f0]">&lt;head&gt;</code> do evertonbrito.com (Next `layout.tsx` + versão estática `index.html`).
          Mapas de calor, gravações de sessão e funis: confere no painel do Clarity.
        </p>
        <div className="mono" style={{ fontSize: "0.7rem" }}>usa a mesma conta pra qualquer site: só troca o ID</div>
      </div>

      {/* roteiro: próximos passos */}
      <div className="card p-5">
        <div className="mono mb-3" style={{ fontSize: "0.66rem" }}>próximos passos do módulo</div>
        <ul className="space-y-2 text-[.82rem] text-[#b8b8b3]">
          <li>→ <b className="text-[#f7f7f5]">Eventos</b>: registrar cliques no botão de WhatsApp e envios de formulário (conversão)</li>
          <li>→ <b className="text-[#f7f7f5]">Pixel interno</b>: quando um visitante do site vira lead, o lead já nasce com a origem no pipeline</li>
        </ul>
      </div>
    </div>
  );
}