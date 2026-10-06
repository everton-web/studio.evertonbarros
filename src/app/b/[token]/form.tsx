"use client";

import { useState } from "react";
import { PERGUNTAS, LIMITE_RESPOSTA } from "@/lib/briefing-perguntas";

export function BriefingForm({ token }: { token: string }) {
  const [v, setV] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [feito, setFeito] = useState(false);
  const [aberto] = useState(() => Date.now());

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (Date.now() - aberto < 2500) return setErro("Confira as respostas e envie de novo.");
    setBusy(true);
    setErro("");
    try {
      const r = await fetch(`/api/b/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respostas: v }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) setFeito(true);
      else setErro(j.error || "Não foi possível enviar agora. Tente de novo.");
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (feito) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <h2 className="text-balance" style={{ fontSize: "1.15rem", fontWeight: 600 }}>Recebemos as suas respostas</h2>
        <p style={{ color: "var(--muted)", marginTop: 8 }}>Obrigado! Já vamos começar a trabalhar no seu site.</p>
      </div>
    );
  }

  const campo = {
    width: "100%",
    background: "rgba(255,255,255,.03)",
    border: "1px solid var(--line)",
    borderRadius: 12,
    padding: "12px 14px",
    color: "var(--ink)",
    fontSize: "1rem",
    outline: "none",
  } as const;

  return (
    <form onSubmit={enviar} style={{ display: "grid", gap: 20 }}>
      {PERGUNTAS.map((p) => (
        <label key={p.id} style={{ display: "block" }}>
          <span style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>{p.rotulo}</span>
          <span style={{ display: "block", color: "var(--muted)", fontSize: ".85rem", marginBottom: 8 }}>{p.dica}</span>
          {p.longa ? (
            <textarea rows={4} maxLength={LIMITE_RESPOSTA} value={v[p.id] || ""} onChange={(e) => setV({ ...v, [p.id]: e.target.value })} style={{ ...campo, resize: "vertical" }} />
          ) : (
            <input maxLength={LIMITE_RESPOSTA} value={v[p.id] || ""} onChange={(e) => setV({ ...v, [p.id]: e.target.value })} style={{ ...campo, height: 48 }} />
          )}
        </label>
      ))}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
      {erro && <p role="alert" style={{ color: "var(--danger)" }}>{erro}</p>}
      <button className="btn-solid" disabled={busy} type="submit" style={{ height: 52 }}>
        {busy ? "Enviando…" : "Enviar respostas"}
      </button>
    </form>
  );
}
