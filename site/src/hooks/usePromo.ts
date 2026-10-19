"use client";

import { useSyncExternalStore } from "react";
import { PROMO_FIM, PROMO_LIGADA } from "@/lib/promo";

// Store de módulo: "now" é atualizado por UM único setInterval (singleton),
// evitando a criação de vários intervals.
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (timer === null) {
    timer = setInterval(() => {
      now = Date.now();
      for (const listener of listeners) listener();
    }, 1000);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

// Snapshot = timestamp "now" (número). Muda a cada segundo -> o contador re-renderiza.
// O valor é a base para derivar "ativa" e "restante".
const getSnapshot = (): number => now;

// SSR/hidratação: o build acontece durante a promo. Retornamos um "now" fixo e
// determinístico (1ms antes do fim), igual no servidor e no cliente, para que:
//  1. o SSR SEMPRE renderize a promo ativa (sem piscar preço original);
//  2. depois do fim (sem redeploy), a hidratação ainda comece em "ativa" e,
//     logo em seguida, re-renderize para "false" via getSnapshot, voltando ao normal.
const getServerSnapshot = (): number => PROMO_FIM.getTime() - 1;

export function usePromo(): { ativa: boolean; restante: number } {
  const nowMs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ativa = PROMO_LIGADA && nowMs < PROMO_FIM.getTime();
  const restante = Math.max(0, PROMO_FIM.getTime() - nowMs);
  return { ativa, restante };
}
