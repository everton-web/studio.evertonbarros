"use client";

import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const AGENT_IDS = ["comando", "caio", "davi", "theo", "mia"];
const AGENT_LABEL: Record<string, { name: string; sub: string }> = {
  comando: { name: "Comando", sub: "geral" },
  caio: { name: "Caio", sub: "comercial" },
  davi: { name: "Davi", sub: "design" },
  theo: { name: "Theo", sub: "dev" },
  mia: { name: "Mia", sub: "conteúdo" },
};

export function Chat() {
  const [agent, setAgent] = useState("comando");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent, messages: history }),
      });
      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => "");
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${t}` };
          return copy;
        });
        setBusy(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (!payload) continue;
          try {
            acc += JSON.parse(payload);
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { role: "assistant", content: acc };
              return copy;
            });
          } catch { /* ok */ }
        }
      }
      if (acc === "") {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: "*(sem resposta)*" };
          return copy;
        });
      }
    } catch (e) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: `⚠️ erro: ${String(e)}` };
        return copy;
      });
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[420px]">
      {/* seletor de agente */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {AGENT_IDS.map((id) => {
          const active = agent === id;
          const a = AGENT_LABEL[id];
          return (
            <button
              key={id}
              onClick={() => setAgent(id)}
              className={`px-4 py-2 rounded-xl text-[.8rem] font-medium transition-colors border ${
                active
                  ? "bg-[#FF4000]/12 border-[#FF4000]/50 text-white"
                  : "border-white/10 text-[#b8b8b3] hover:border-white/25 hover:text-white"
              }`}
            >
              {a.name}
              <span className="mono ml-2" style={{ fontSize: "0.7rem", opacity: 0.7 }}>{a.sub}</span>
            </button>
          );
        })}
      </div>

      {/* mensagens */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
        {messages.length === 0 && (
          <div className="text-center mt-16">
            <p className="text-[.95rem] text-[#8a8a85] mb-3">Fale com um agente da agência.</p>
            <p className="mono" style={{ fontSize: "0.66rem" }}>
              ex: "Caio, me ajude a qualificar a clínica X" · "Mia, drafts um case da Concept"
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-[.88rem] leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-[#FF4000] text-white rounded-br-md"
                  : "bg-[var(--bg-2)] border border-[var(--line)] text-[#d8d8d3] rounded-bl-md"
              }`}
            >
              {m.content || (m.role === "assistant" && busy && "…")}
            </div>
          </div>
        ))}
      </div>

      {/* input */}
      <div className="flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) send(); }}
          placeholder="Digite e dê Enter…"
          className="field-input flex-1"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="h-[52px] px-6 bg-[#FF4000] hover:bg-[#ff5c22] disabled:opacity-50 disabled:hover:bg-[#FF4000] text-white rounded-[14px] text-[.9rem] font-medium transition-colors"
        >
          {busy ? "…" : "Enviar"}
        </button>
      </div>
      <p className="mono mt-3" style={{ fontSize: "0.7rem" }}>
        gemini · contexto real do vault (kanban, placar, inbox)
      </p>
    </div>
  );
}