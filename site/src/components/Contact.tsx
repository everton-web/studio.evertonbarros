"use client";

import { useState, useRef } from "react";
import { AnimatedSection } from "./AnimatedSection";
import { TriangleIcon } from "./TriangleIcon";
import { useLang } from "@/context/LanguageContext";

type Status = "idle" | "sending" | "sent" | "error";

// Máscara de telefone BR: (DD) 0000-0000 / (DD) 00000-0000
const formatPhone = (value: string) => {
  let digits = value.replace(/\D/g, "");
  // Remove DDI 55 quando vem junto (ex.: +55 11 99999-9999).
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export function Contact() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [phone, setPhone] = useState("");
  const { t, lang } = useLang();

  // Opções do dropdown = títulos de "O que eu entrego" (entregáveis + especiais).
  const projectOptions = [
    ...t.services.core.map((service) => service.title),
    ...t.services.special.items.map((item) => item.title),
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;

    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const contact = String(data.get("contact") ?? "").trim();
    const project = String(data.get("project") ?? "").trim();

    const message = encodeURIComponent(t.contact.waGreeting(name, project, contact));

    // Abre o WhatsApp no mesmo gesto do usuário (evita bloqueio de pop-up).
    window.open(`https://wa.me/5571999261967?text=${message}`, "_blank", "noopener,noreferrer");

    // Registra o lead na planilha em paralelo.
    setStatus("sending");
    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contact, project, lang }),
    })
      .then((res) => res.json().catch(() => ({ ok: false })))
      .then((res: { ok?: boolean }) => setStatus(res.ok ? "sent" : "error"))
      .catch(() => setStatus("error"));
  };

  const inputStyle = {
    fontFamily: "var(--font-sans)",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--color-border)",
  };
  const inputClass =
    "w-full py-3.5 px-4 text-[0.9rem] text-[var(--color-text)] rounded-[8px] outline-none transition-all duration-300 focus:border-[var(--color-accent)] focus:bg-[rgba(255,64,0,0.04)]";
  const labelClass =
    "block text-[0.75rem] font-medium tracking-[0.06em] uppercase text-[var(--color-text-muted)] mb-2";

  return (
    <section
      id="contact"
      style={{ background: "var(--color-bg-soft)", padding: "var(--section-pad) 0" }}
    >
      <div className="relative z-[2] container-site">
        <div className="flex items-start gap-20 max-lg:flex-col max-lg:gap-16">
          <div className="flex-1 max-w-[520px]">
            <AnimatedSection>
              <div className="flex items-center gap-6 mb-16 max-md:mb-10">
                <span className="section-number">04</span>
                <div className="divider-accent" />
                <span className="section-label">
                  <TriangleIcon className="w-3 h-3" />
                  {t.contact.label}
                </span>
              </div>

              <h2
                className="mb-6"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "clamp(1.9rem, 4.2vw, 3.5rem)",
                  fontWeight: 500,
                  lineHeight: 1.05,
                  letterSpacing: "-0.06em",
                }}
              >
                {t.contact.titleBefore}
                <br />
                <span className="serif">{t.contact.titleAccent}</span>{" "}
                {t.contact.titleAfter}
              </h2>

              <p
                className="mb-10 text-[var(--color-text-secondary)]"
                style={{ fontSize: "0.95rem", lineHeight: 1.75, maxWidth: "400px" }}
              >
                {t.contact.intro}
              </p>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {t.contact.status}
                </span>
              </div>
              <p className="text-[0.75rem] text-[var(--color-text-dim)]">
                {t.contact.coverage}
              </p>
            </AnimatedSection>
          </div>

          <AnimatedSection delay={0.2} direction="right" className="flex-1 w-full max-w-[480px] max-lg:max-w-full">
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClass}>{t.contact.nameLabel}</label>
                <input
                  type="text"
                  name="name"
                  placeholder={t.contact.namePlaceholder}
                  required
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className={labelClass}>{t.contact.contactLabel}</label>
                <input
                  key={lang}
                  type={lang === "pt" ? "tel" : "email"}
                  name="contact"
                  placeholder={t.contact.contactPlaceholder}
                  required
                  className={inputClass}
                  style={inputStyle}
                  {...(lang === "pt"
                    ? {
                        value: phone,
                        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                          setPhone(formatPhone(e.target.value)),
                        inputMode: "numeric" as const,
                        autoComplete: "tel",
                        pattern: "\\(\\d{2}\\) \\d{4,5}-\\d{4}",
                        maxLength: 16,
                      }
                    : { autoComplete: "email" })}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="project">
                  {t.contact.projectLabel}
                </label>
                <div className="relative">
                  <select
                    key={lang}
                    id="project"
                    name="project"
                    defaultValue=""
                    className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                    style={inputStyle}
                  >
                    <option value="" disabled>
                      {t.contact.projectSelect}
                    </option>
                    {projectOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full inline-flex items-center justify-center gap-2 bg-[var(--color-accent)] text-[var(--color-text)] rounded-full font-medium text-sm hover:bg-[var(--color-accent-hover)] hover:-translate-y-0.5 hover:shadow-[0_0_40px_var(--color-accent-glow)] transition-all cursor-pointer disabled:opacity-60"
                style={{ padding: "14px 32px", marginTop: "0.5rem" }}
              >
                {status === "sending" ? t.contact.sending : t.contact.submit}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m7 17 9.2-9.2M17 17V8H8" />
                </svg>
              </button>

              {status === "sent" && (
                <p className="text-center text-[0.8rem] text-emerald-400" role="status">
                  {t.contact.success}
                </p>
              )}
              {status === "error" && (
                <p className="text-center text-[0.8rem] text-red-400" role="alert">
                  {t.contact.error}
                </p>
              )}
            </form>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
