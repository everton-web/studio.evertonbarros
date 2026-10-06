// UI kit v2 — primitivas únicas da IDV "Comando".
// Inter para tudo · superfícies em degraus · respiro médio · microestados completos.

export function Card({ children, className = "", interactive = false }: {
  children: React.ReactNode; className?: string; interactive?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-[var(--line)] bg-[var(--bg-2)] ${
      interactive ? "transition-colors hover:border-[var(--line-2)]" : ""
    } ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeader({ kicker, title, sub, right }: {
  kicker?: string; title: string; sub?: string; right?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && <div className="mono mb-2.5">{kicker}</div>}
        <h1 className="text-[clamp(1.5rem,2.6vw,1.75rem)] font-semibold tracking-[-.025em] leading-tight text-balance">
          {title}
        </h1>
        {sub && <p className="text-[.875rem] text-[var(--muted)] mt-2 max-w-[620px] leading-relaxed">{sub}</p>}
      </div>
      {right && <div className="flex gap-2 shrink-0">{right}</div>}
    </div>
  );
}

export function Section({ title, sub, right, children, className = "" }: {
  title?: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-[var(--line)] bg-[var(--bg-2)] p-6 ${className}`}>
      {(title || sub || right) && (
        <header className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            {title && <h2 className="label">{title}</h2>}
            {sub && <p className="text-[.82rem] text-[var(--muted)] mt-1">{sub}</p>}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`chip ${className}`}>{children}</span>;
}

export function Stat({ label, value, cor = "var(--ink)", sub, onClick, className = "" }: {
  label: string; value: React.ReactNode; cor?: string; sub?: string; onClick?: () => void; className?: string;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`rounded-2xl border border-[var(--line)] bg-[var(--bg-2)] p-5 text-left ${
        onClick ? "transition-colors hover:border-[var(--line-2)]" : ""
      } ${className}`}
    >
      <div className="label mb-2.5">{label}</div>
      <div className="nums text-[1.75rem] leading-none font-semibold" style={{ color: cor }}>{value}</div>
      {sub && <div className="text-[.75rem] text-[var(--dim)] mt-2.5">{sub}</div>}
    </Comp>
  );
}

export function StatCard({ label, value, delta, deltaCor, spark, onClick }: {
  label: string; value: React.ReactNode; delta?: string; deltaCor?: string;
  spark?: React.ReactNode; onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`w-full rounded-2xl border border-[var(--line)] bg-[var(--bg-2)] p-5 text-left ${
        onClick ? "transition-colors hover:border-[var(--line-2)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="label">{label}</div>
        {spark && <div className="shrink-0">{spark}</div>}
      </div>
      <div className="nums text-[1.75rem] leading-none font-semibold mt-3">{value}</div>
      {delta && <div className="text-[.75rem] mt-2.5" style={{ color: deltaCor || "var(--muted)" }}>{delta}</div>}
    </Comp>
  );
}

export function Empty({ texto, cta, onCta }: { texto: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 py-8">
      <p className="text-[.82rem] text-[var(--dim)]">{texto}</p>
      {cta && <button onClick={onCta} className="btn-ghost !h-9 !px-4 !text-[.78rem]">{cta}</button>}
    </div>
  );
}
