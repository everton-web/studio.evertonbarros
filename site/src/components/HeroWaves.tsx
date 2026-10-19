"use client";

import { useEffect, useRef } from "react";

// Ondas de linhas no topo do hero (referência: tecido de fios laranja com a borda acesa).
// Canvas 2D: N fios empilhados formam uma superfície que ondula devagar; o fio da frente
// é o mais quente (quase dourado) e os de trás somem no preto. Pausa fora da tela e
// fica parado com prefers-reduced-motion.
// base = espelhada, subindo do pé da seção (CTA final invadindo o rodapé)
export function HeroWaves({ base = false }: { base?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1, fios = 90, passos = 140;
    let raf = 0, visivel = true;
    const t0 = performance.now();

    const medir = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fios = w < 700 ? 55 : 90;
      passos = w < 700 ? 90 : 140;
    };

    const desenhar = (seg: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over"; // sem somar luz: somar clareava o laranja para o amarelo
      const tt = seg * 0.18;
      const yDe = (u: number, sx: number) => {
        const base = h * (-0.45 + 0.72 * u);
        const amp = h * (0.04 + 0.12 * u);
        const fase = u * 2.2 + tt;
        const curva = Math.sin(sx * Math.PI * 1.1 - 0.35) * amp * 1.5;
        const onda = Math.sin(sx * 4.6 + fase) * amp * 0.4 + Math.sin(sx * 2.1 - fase * 0.7) * amp * 0.3;
        return base + curva + onda;
      };
      // ponto mais aceso (mesmo laranja da marca) que passeia devagar pela borda da frente
      const foco = 0.28 + Math.sin(tt * 0.9) * 0.12;
      for (let i = 0; i < fios; i++) {
        const u = i / (fios - 1); // 0 = fundo (topo), 1 = frente (borda acesa)
        ctx.beginPath();
        for (let k = 0; k <= passos; k++) {
          const sx = k / passos;
          const y = yDe(u, sx);
          if (k === 0) ctx.moveTo(sx * w, y); else ctx.lineTo(sx * w, y);
        }
        const frente = Math.pow(u, 10);
        const gr = ctx.createLinearGradient(0, 0, w, 0);
        const a = 0.06 + 0.26 * Math.pow(u, 1.6);
        gr.addColorStop(0, `rgba(255,64,0,${a * 0.45})`);
        gr.addColorStop(Math.max(0, foco - 0.22), `rgba(255,64,0,${a})`);
        gr.addColorStop(foco, `rgba(255,${Math.round(64 + 40 * frente)},${Math.round(20 * frente)},${a + 0.6 * frente})`);
        gr.addColorStop(Math.min(1, foco + 0.3), `rgba(255,64,0,${a + 0.15 * frente})`);
        gr.addColorStop(1, `rgba(255,64,0,${a * 0.5})`);
        ctx.strokeStyle = gr;
        ctx.lineWidth = 0.6 + frente * 1.1;
        if (frente > 0.3) { ctx.shadowColor = "rgba(255,64,0,0.9)"; ctx.shadowBlur = 14; } else { ctx.shadowBlur = 0; }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "source-over";
    };

    const loop = (agora: number) => {
      if (visivel) desenhar((agora - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };

    medir();
    if (reduz) desenhar(4);
    else raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => { medir(); if (reduz) desenhar(4); });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; });
    io.observe(cv);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 z-[1] w-full ${base ? "bottom-0 h-[105%]" : "top-0 h-[54%]"}`}
      style={{
        transform: base ? "scaleY(-1)" : undefined,
        maskImage: "linear-gradient(to bottom, #000 55%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 55%, transparent 100%)",
      }}
    />
  );
}
