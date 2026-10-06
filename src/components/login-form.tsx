"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

function Triangle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor">
      <path d="M50 10 Q58.6 45 84.6 70 Q50 60 15.4 70 Q41.4 45 50 10Z" />
    </svg>
  );
}

const ease = [0.22, 1, 0.36, 1] as const;

export function LoginForm() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [lembrar, setLembrar] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: user.trim(), pass, lembrar }),
      });
      const j = await r.json();
      if (j.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      setError(j.error || "Usuário ou senha incorretos");
    } catch {
      setError("Erro de conexão. Tente de novo.");
    }
    setLoading(false);
  }

  return (
    <div className="grain min-h-screen grid place-items-center p-6 relative">
      <div className="relative w-full max-w-[420px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="bg-[#0d0d0f] border border-[var(--line)] rounded-[22px] p-10 md:p-12 shadow-[0_40px_120px_-30px_rgba(0,0,0,.9)]"
        >
          {/* marca */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease }}
            className="flex items-center gap-3 mb-10"
          >
            <motion.span whileHover={{ rotate: 180 }} transition={{ duration: 0.5 }} className="inline-block">
              <Triangle className="w-5 h-5 text-[#FF4000]" />
            </motion.span>
            <b className="text-[1.1rem] font-medium tracking-[-.02em]">Agência</b>
            <span className="mono pl-3 border-l border-white/10" style={{ color: "#9a9a95" }}>Comando</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6, ease }}
          >
            <h1 className="text-[2.3rem] leading-[1.05] font-medium tracking-[-.035em] mb-3">
              Bem-vindo<br />de volta.
            </h1>
            <p className="text-[.9rem] text-[#b8b8b3] mb-9">O comando da sua agência está aqui.</p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-[.82rem] text-[#ff8a66] bg-[#FF4000]/10 border border-[#FF4000]/25 rounded-xl px-4 py-3 mb-6 overflow-hidden"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={submit}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6, ease }}
              className="mb-5"
            >
              <label className="block mono mb-2.5">Usuário</label>
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                autoFocus
                autoComplete="username"
                placeholder="everton"
                className="field-input"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6, ease }}
              className="mb-5 relative"
            >
              <label className="block mono mb-2.5">Senha</label>
              <input
                type={show ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••••"
                className="field-input pr-12"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 bottom-[13px] text-[#8a8a85] hover:text-white p-1 rounded-md transition"
                aria-label="mostrar senha"
              >
                {show ? (
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </motion.div>

            <motion.label
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6, ease }}
              htmlFor="lembrar"
              className="mb-8 flex items-center gap-3 cursor-pointer select-none text-[.86rem] text-[#b8b8b3] hover:text-white transition-colors w-fit"
            >
              <input id="lembrar" type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} className="peer sr-only" />
              <span
                aria-hidden
                className="grid place-items-center w-[18px] h-[18px] rounded-[5px] border border-white/20 bg-white/[.03] transition-colors peer-checked:bg-[#FF4000] peer-checked:border-[#FF4000] peer-focus-visible:ring-2 peer-focus-visible:ring-[#FF4000]/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0d0d0f]"
              >
                {lembrar && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0a0a0b" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                )}
              </span>
              Deixar conectado
            </motion.label>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.6, ease }}>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full h-[52px] bg-[#FF4000] hover:bg-[#ff5c22] disabled:opacity-60 text-[var(--accent-ink)] rounded-[14px] text-[.95rem] font-semibold tracking-tight transition-colors flex items-center justify-center gap-2.5 relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando…
                </>
              ) : (
                <>
                  Entrar
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </>
              )}
            </motion.button>
            </motion.div>
          </form>

          <div className="mt-8 text-center mono" style={{ fontSize: "0.72rem", color: "#9a9a95" }}>
            app.evertonbrito.com
          </div>
        </motion.div>
      </div>
    </div>
  );
}