export function semViuva(texto: string): string {
  if (!texto) return texto;
  const i = texto.lastIndexOf(" ");
  if (i === -1) return texto;
  return texto.slice(0, i) + "\u00A0" + texto.slice(i + 1);
}
