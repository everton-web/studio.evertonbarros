import { isAuthed } from "@/lib/auth";
import { buildData } from "@/lib/data";
import { AGENTS, stateSummary } from "@/lib/agents";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const API_KEY = process.env.GEMINI_API_KEY;
const MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
].filter(Boolean) as string[];

export async function POST(req: Request) {
  if (!(await isAuthed())) return new Response("unauthorized", { status: 401 });
  if (!API_KEY) return new Response("GEMINI_API_KEY não configurada", { status: 500 });

  const { agent, messages } = await req.json();
  const persona = AGENTS[agent] || AGENTS.comando;
  const data = await buildData();
  const system = `${persona.prompt}\n\n${stateSummary(data)}`;

  const contents = (messages as { role: string; content: string }[]).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let res: Response | null = null;
  let lastErr = "";
  for (const MODEL of MODELS) {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": API_KEY,
        },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: system }] },
          generationConfig: { temperature: 0.7 },
        }),
      }
    );
    if (res.ok && res.body) break;
    lastErr = `modelo ${MODEL} → ${res.status} ${(await res.text().catch(() => "")).slice(0, 120)}`;
    res = null;
  }

  if (!res || !res.body) {
    return new Response(`Gemini indisponível: ${lastErr}`, { status: 502 });
  }

  // encaminha o SSE do Gemini para o cliente
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
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
            if (!payload || payload === "[DONE]") continue;
            try {
              const j = JSON.parse(payload);
              const text = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
              if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify(text)}\n\n`));
            } catch { /* linha parcial */ }
          }
        }
      } catch (e) {
        try { controller.error(e); } catch { /* já fechado */ }
      } finally {
        try { controller.close(); } catch { /* ok */ }
      }
    },
    cancel() {
      try { reader.cancel(); } catch { /* ok */ }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}