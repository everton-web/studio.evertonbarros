"use client";

import { useEffect, useState } from "react";
import type { Analise, Falta } from "@/lib/analise";

// Raio-x da presença digital do lead: Google Meu Negócio + site + redes + o que falta.
// Mostrado na ficha do lead (clique no card). A análise fica salva no vault.

const PRI: Record<Falta["prioridade"], { cor: string; lbl: string }> = {
  alta: { cor: "#ff6b4a", lbl: "alta" },
  media: { cor: "#d9a03a", lbl: "média" },
  baixa: { cor: "#8a8a85", lbl: "baixa" },
};
const AREA: Record<Falta["area"], string> = { google: "Google", site: "Site", redes: "Redes", rastreio: "Rastreio", contato: "Contato" };
const scoreCor = (n: number) => (n >= 75 ? "#3ddc84" : n >= 50 ? "#d9a03a" : "#ff6b4a");

function Lbl({ children }: { children: React.ReactNode }) {
  return <div className="mono mb-2" style={{ fontSize: "0.68rem" }}>{children}</div>;
}

function Chip({ href, children, cor = "#54b8f0", vazio }: { href?: string; children: React.ReactNode; cor?: string; vazio?: boolean }) {
  const base = "inline-flex items-center gap-1.5 h-[36px] px-3 rounded-lg border text-[.78rem] transition-colors";
  if (!href || vazio) {
    return <span className={`${base} border-white/8 text-[#5d5d58] line-through decoration-white/20`}>{children}</span>;
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`${base} hover:bg-white/5`} style={{ color: cor, borderColor: cor + "40" }}>
      {children} <span aria-hidden="true">↗</span>
    </a>
  );
}

function Linha({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-[var(--line)] last:border-0">
      <span className="mono shrink-0" style={{ fontSize: "0.7rem" }}>{k}</span>
      <span className="text-[.8rem] text-[#cacac4] text-right break-words min-w-0">{v}</span>
    </div>
  );
}

const sn = (b: boolean | undefined) => (b ? <span className="text-[#3ddc84]">sim</span> : <span className="text-[#ff6b4a]">não</span>);

export function AnalisePresenca({ leadId, onAtualizada }: { leadId: string; onAtualizada?: () => void }) {
  const [a, setA] = useState<Analise | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    setCarregando(true); setA(null); setErro("");
    fetch(`/api/analise?id=${encodeURIComponent(leadId)}`)
      .then((r) => r.json())
      .then((j) => { if (vivo) setA(j.analise || null); })
      .catch(() => {})
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [leadId]);

  async function rodar() {
    setRodando(true); setErro("");
    try {
      const r = await fetch("/api/analise", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: leadId }) });
      const j = await r.json();
      if (!j.ok) setErro(j.error || "falha na análise");
      else { setA(j.analise); onAtualizada?.(); }
    } catch { setErro("falha de rede"); }
    finally { setRodando(false); }
  }

  const botao = (
    <button onClick={rodar} disabled={rodando}
      className="flex items-center justify-center gap-2 h-[44px] px-4 rounded-xl bg-[#7aa2ff]/12 border border-[#7aa2ff]/30 text-[#7aa2ff] hover:bg-[#7aa2ff]/20 text-[.82rem] font-medium transition-colors disabled:opacity-60">
      {rodando ? "analisando… (até 20s)" : a ? "↻ atualizar análise" : "▶ analisar presença digital"}
    </button>
  );

  if (carregando) return <div className="mono mb-5" style={{ fontSize: "0.7rem" }}>carregando análise…</div>;

  if (!a) {
    return (
      <div className="mb-6 rounded-2xl border border-dashed border-[#7aa2ff]/30 p-4">
        <Lbl>presença digital</Lbl>
        <p className="text-[.82rem] text-[#9a9a95] mb-3 leading-relaxed">
          Ainda sem análise. O agente verifica o Google Meu Negócio, o site, Instagram, WhatsApp e rastreamento, e lista o que falta.
        </p>
        {botao}
        {erro && <p className="text-[.78rem] text-[#ff6b4a] mt-2">{erro}</p>}
      </div>
    );
  }

  const g = a.google;
  const s = a.site;
  const altas = a.faltas.filter((f) => f.prioridade === "alta").length;

  return (
    <div className="mb-6 rounded-2xl border border-[var(--line)] bg-white/[.02] p-4">
      {/* placar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="grid place-items-center w-[64px] h-[64px] rounded-2xl shrink-0" style={{ background: scoreCor(a.pontuacao) + "18", border: `1px solid ${scoreCor(a.pontuacao)}55` }}>
          <b className="nums tabular-nums text-[1.35rem] leading-none" style={{ color: scoreCor(a.pontuacao) }}>{a.pontuacao}</b>
        </div>
        <div className="min-w-0">
          <div className="text-[.92rem] font-medium">Presença digital {a.pontuacao}/100</div>
          <div className="mono mt-0.5" style={{ fontSize: "0.7rem" }}>
            {altas} {altas === 1 ? "falha grave" : "falhas graves"} · {a.faltas.length} pontos a melhorar · {new Date(a.geradoEm).toLocaleDateString("pt-BR")}
          </div>
        </div>
      </div>

      {/* links rápidos */}
      <Lbl>links</Lbl>
      <div className="flex flex-wrap gap-2 mb-5">
        <Chip href={a.links.maps} cor="#3ddc84">Google Maps</Chip>
        <Chip href={s?.url} vazio={!s}>Site</Chip>
        <Chip href={a.redes.instagram || a.links.buscaInstagram} cor="#e1306c">{a.redes.instagram ? "Instagram" : "buscar Instagram"}</Chip>
        <Chip href={a.links.whatsapp} cor="#25d366" vazio={!a.links.whatsapp}>WhatsApp</Chip>
        {a.redes.facebook && <Chip href={a.redes.facebook} cor="#7aa2ff">Facebook</Chip>}
        {a.redes.tiktok && <Chip href={a.redes.tiktok} cor="#cacac4">TikTok</Chip>}
        {a.redes.youtube && <Chip href={a.redes.youtube} cor="#ff4444">YouTube</Chip>}
        {a.redes.linkedin && <Chip href={a.redes.linkedin} cor="#7aa2ff">LinkedIn</Chip>}
        <Chip href={a.links.buscaGoogle} cor="#8a8a85">busca no Google</Chip>
      </div>

      {/* o que falta */}
      <Lbl>o que falta para o negócio ficar melhor</Lbl>
      <div className="space-y-2 mb-5">
        {a.faltas.length === 0 && <p className="text-[.82rem] text-[#3ddc84]">Nada crítico encontrado.</p>}
        {a.faltas.map((f, i) => (
          <div key={i} className="rounded-xl border px-3.5 py-2.5" style={{ borderColor: PRI[f.prioridade].cor + "33", background: PRI[f.prioridade].cor + "0a" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="mono px-1.5 py-0.5 rounded" style={{ fontSize: "0.62rem", color: PRI[f.prioridade].cor, border: `1px solid ${PRI[f.prioridade].cor}55` }}>{PRI[f.prioridade].lbl}</span>
              <span className="mono" style={{ fontSize: "0.62rem" }}>{AREA[f.area]}</span>
              <span className="text-[.84rem] text-[#e8e8e6] font-medium">{f.item}</span>
            </div>
            <p className="text-[.78rem] text-[#9a9a95] leading-relaxed mt-1">{f.porque}</p>
          </div>
        ))}
      </div>

      {/* Google Meu Negócio (réplica) */}
      <Lbl>google meu negócio {g.fonte === "places" ? "· dados do Google" : "· dados da ficha (sem chave do Google)"}</Lbl>
      <div className="rounded-xl border border-[var(--line)] px-3.5 py-1 mb-5">
        <Linha k="nota" v={g.nota != null ? `★ ${g.nota.toLocaleString("pt-BR")}` : "-"} />
        <Linha k="avaliações" v={g.avaliacoes ?? "-"} />
        {g.fonte === "places" && (
          <>
            <Linha k="categorias" v={g.categorias.join(", ") || "-"} />
            <Linha k="endereço" v={g.endereco || "-"} />
            <Linha k="telefone" v={g.telefone || <span className="text-[#ff6b4a]">não cadastrado</span>} />
            <Linha k="site no perfil" v={g.siteNoPerfil || <span className="text-[#ff6b4a]">não cadastrado</span>} />
            <Linha k="fotos" v={g.fotos != null ? (g.fotos >= 10 ? "10+" : g.fotos) : "-"} />
            <Linha k="última avaliação" v={g.ultimaAvaliacao ? new Date(g.ultimaAvaliacao).toLocaleDateString("pt-BR") : "-"} />
            <Linha k="horário" v={g.horario.length ? <span className="block text-left">{g.horario.map((h) => <span key={h} className="block">{h}</span>)}</span> : <span className="text-[#ff6b4a]">não informado</span>} />
          </>
        )}
      </div>
      {g.avaliacoesRecentes.length > 0 && (
        <div className="mb-5 space-y-2">
          <Lbl>avaliações recentes</Lbl>
          {g.avaliacoesRecentes.map((r, i) => (
            <div key={i} className="text-[.78rem] text-[#9a9a95] border-l-2 pl-3" style={{ borderColor: r.nota >= 4 ? "#3ddc84" : "#ff6b4a" }}>
              <b className="text-[#cacac4]">★ {r.nota} · {r.autor}</b> <span className="mono" style={{ fontSize: "0.66rem" }}>{r.quando}</span>
              <p className="mt-0.5">{r.texto || "(sem texto)"}</p>
            </div>
          ))}
        </div>
      )}

      {/* site */}
      {s && (
        <>
          <Lbl>site</Lbl>
          <div className="rounded-xl border border-[var(--line)] px-3.5 py-1 mb-5">
            <Linha k="no ar" v={s.ok ? <span className="text-[#3ddc84]">sim · HTTP {s.status}{s.ms != null ? ` · ${(s.ms / 1000).toFixed(1)}s` : ""}</span> : <span className="text-[#ff6b4a]">não {s.status ? `(HTTP ${s.status})` : ""}</span>} />
            <Linha k="plataforma" v={s.plataforma} />
            <Linha k="https" v={sn(s.https)} />
            <Linha k="celular" v={sn(s.celular)} />
            <Linha k="título" v={s.titulo || "-"} />
            <Linha k="descrição Google" v={s.descricao || <span className="text-[#ff6b4a]">ausente</span>} />
            <Linha k="formulário" v={sn(s.formulario)} />
            <Linha k="analytics / gtm" v={sn(s.rastreio.ga4 || s.rastreio.gtm)} />
            <Linha k="pixel meta" v={sn(s.rastreio.pixel)} />
          </div>
        </>
      )}

      {/* contatos achados */}
      {(a.contatos.emails.length > 0 || a.contatos.telefones.length > 0) && (
        <>
          <Lbl>contatos encontrados no site</Lbl>
          <p className="text-[.8rem] text-[#cacac4] mb-5 break-words">{[...a.contatos.emails, ...a.contatos.telefones].join(" · ")}</p>
        </>
      )}

      {a.fortes.length > 0 && (
        <>
          <Lbl>pontos fortes (use na abordagem)</Lbl>
          <ul className="mb-5 space-y-1">
            {a.fortes.map((x, i) => <li key={i} className="text-[.8rem] text-[#3ddc84]">✓ {x}</li>)}
          </ul>
        </>
      )}

      {botao}
      {erro && <p className="text-[.78rem] text-[#ff6b4a] mt-2">{erro}</p>}
    </div>
  );
}
