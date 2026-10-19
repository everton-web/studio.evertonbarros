"use client";

import { usePromo } from "@/hooks/usePromo";
import { useLang } from "@/context/LanguageContext";

const MS_DAY = 86_400_000;
const MS_HOUR = 3_600_000;
const MS_MIN = 60_000;
const MS_SEC = 1_000;

export function PromoBanner({ variant }: { variant: "top" | "inline" }) {
  const { t } = useLang();
  const { ativa, restante } = usePromo();

  if (!ativa) return null;

  const days = Math.floor(restante / MS_DAY);
  const hours = Math.floor((restante % MS_DAY) / MS_HOUR);
  const minutes = Math.floor((restante % MS_HOUR) / MS_MIN);
  const seconds = Math.floor((restante % MS_MIN) / MS_SEC);
  const pad = (n: number) => String(n).padStart(2, "0");

  const isTop = variant === "top";

  if (!isTop) {
    const micro = `${days}${t.promo.days} ${pad(hours)}${t.promo.hours}`;

    return (
      <div
        role="note"
        aria-label={t.promo.banner}
        className="w-full flex items-center gap-[0.5rem] mb-12 max-md:mb-8"
        style={{
          fontSize: "0.72rem",
          fontWeight: 500,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          lineHeight: 1.4,
          color: "var(--color-text-secondary)",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--color-accent)",
            flex: "none",
          }}
        />
        <span>{t.promo.micro}</span>
        <span aria-hidden>·</span>
        <span
          className="tabular-nums"
          style={{ color: "var(--color-accent)", whiteSpace: "nowrap" }}
        >
          {micro}
        </span>
      </div>
    );
  }

  const countdown = `${days}${t.promo.days} ${pad(hours)}${t.promo.hours} ${pad(
    minutes
  )}${t.promo.minutes} ${pad(seconds)}${t.promo.seconds}`;

  return (
    <div
      role="region"
      aria-label={t.promo.banner}
      className={
        isTop
          ? "w-full flex items-center justify-center px-4 py-2"
          : "w-full flex items-center justify-center px-4 py-3 rounded-[8px] mb-6"
      }
      style={
        isTop
          ? {
              background:
                "var(--color-accent)",
              color: "#0a0a0b",
            }
          : {
              background: "var(--color-accent-subtle)",
              border: "1px solid var(--color-accent)",
              color: "var(--color-text)",
            }
      }
    >
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[0.75rem] font-semibold leading-snug">
        <span>{t.promo.banner}</span>
        <span
          className="tabular-nums inline-flex items-center rounded-full"
          style={
            isTop
              ? {
                  background: "rgba(0, 0, 0, 0.25)",
                  padding: "2px 10px",
                  color: "#fff",
                }
              : {
                  background: "var(--color-accent)",
                  padding: "2px 10px",
                  color: "var(--color-bg)",
                }
          }
        >
          {countdown}
        </span>
      </p>
    </div>
  );
}
