"use client";

import { useEffect, useState } from "react";
import { buscarCotacao, type Cotacao } from "@/lib/cambio";

// Só busca a cotação quando o site está em inglês; em português devolve null.
export function useCambio(ativo: boolean): Cotacao | null {
  const [cotacao, setCotacao] = useState<Cotacao | null>(null);

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    const carregar = () => buscarCotacao().then((c) => vivo && setCotacao(c)).catch(() => {});
    carregar();
    const id = setInterval(carregar, 30 * 60 * 1000);
    return () => { vivo = false; clearInterval(id); };
  }, [ativo]);

  return ativo ? cotacao : null;
}
