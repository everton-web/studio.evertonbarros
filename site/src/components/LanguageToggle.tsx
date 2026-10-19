"use client";

import { useLang } from "@/context/LanguageContext";
import type { Lang } from "@/lib/i18n";

const options: { code: Lang; label: string }[] = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
];

export function LanguageToggle() {
  const { lang, setLang } = useLang();

  return (
    <div
      className="relative flex items-center rounded-full p-[3px]"
      style={{ border: "1px solid var(--color-border)" }}
      role="group"
      aria-label="Language"
    >
      {options.map((opt) => {
        const active = lang === opt.code;
        return (
          <button
            key={opt.code}
            onClick={() => setLang(opt.code)}
            aria-pressed={active}
            className={`relative z-[1] px-3 py-1 text-[0.7rem] font-semibold tracking-[0.06em] rounded-full transition-colors duration-300 cursor-pointer ${
              active
                ? "text-[var(--color-bg)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {active && (
              <span
                className="absolute inset-0 rounded-full -z-[1]"
                style={{ background: "var(--color-text)" }}
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
