// Bonecos 2D dos agentes — pixel-art retrô (estilo indie: 12x14 grid, cores vibrantes).
// Crisp edges + pixelated para cara de game antigo.

type Variant = "caio" | "davi" | "theo" | "mia" | "default";

const SKIN = "#eec39a";
const HAIR = "#241b16";
const EYE = "#1d1d1f";
const MOUTH = "#8a4b33";
const SHIRT = "#0c0c0d";

function P({ x, y, w = 1, h = 1, f }: { x: number; y: number; w?: number; h?: number; f: string }) {
  return <rect x={x} y={y} width={w} height={h} fill={f} shapeRendering="crispEdges" />;
}

export function AgentAvatar({ nome, cor, size = 44 }: { nome: string; cor: string; size?: number }) {
  const v = variant(nome);
  const c = cor || "#FF4000";

  return (
    <svg
      viewBox="0 0 12 14"
      width={size}
      height={size}
      aria-label={`Avatar de ${nome}`}
      role="img"
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated" }}
    >
      {/* fundo do quadro */}
      <rect x="0" y="0" width="12" height="14" rx="2" fill="#101012" />
      <rect x="0.5" y="0.5" width="11" height="13" rx="2" fill="none" stroke="rgba(255,255,255,.09)" />

      {/* busto / camisa */}
      <P x={1} y={11} w={10} h={3} f={SHIRT} />
      <P x={4} y={10} w={4} h={1} f={c} />

      {/* pescoço */}
      <P x={5} y={7} w={2} h={2} f={SKIN} />

      {/* orelhas */}
      <P x={3} y={5} w={1} h={1} f={SKIN} />
      <P x={8} y={5} w={1} h={1} f={SKIN} />

      {/* rosto */}
      <P x={4} y={3} w={4} h={4} f={SKIN} />

      {/* variações de cabelo/acessório por agente */}
      {v === "caio" && (
        <>
          <P x={3} y={2} w={6} h={1} f={HAIR} />
          <P x={3} y={3} w={1} h={2} f={HAIR} />
          <P x={8} y={3} w={1} h={2} f={HAIR} />
          <P x={5} y={8} w={2} h={2} f={c} />
        </>
      )}
      {v === "davi" && (
        <>
          <P x={3} y={2} w={6} h={1} f={HAIR} />
          <P x={13 - 8} y={3} w={1} h={2} f={HAIR} />
          <P x={7} y={3} w={1} h={1} f={HAIR} />
          <P x={3} y={1} w={6} h={1} f={c} />
          <P x={2} y={2} w={3} h={1} f={c} />
        </>
      )}
      {v === "theo" && (
        <>
          <P x={3} y={2} w={6} h={1} f={HAIR} />
          <P x={3} y={3} w={1} h={2} f={HAIR} />
          <P x={8} y={3} w={1} h={2} f={HAIR} />
          <P x={4} y={4} w={1} h={2} f={c} />
          <P x={7} y={4} w={1} h={2} f={c} />
          <P x={5} y={4} w={2} h={1} f={c} />
        </>
      )}
      {v === "mia" && (
        <>
          <P x={3} y={2} w={6} h={1} f={HAIR} />
          <P x={3} y={3} w={1} h={2} f={HAIR} />
          <P x={8} y={3} w={1} h={2} f={HAIR} />
          <P x={2} y={4} w={1} h={2} f={c} />
          <P x={9} y={4} w={1} h={2} f={c} />
          <P x={4} y={2} w={4} h={1} f={c} />
        </>
      )}
      {v === "default" && (
        <>
          <P x={3} y={2} w={6} h={1} f={HAIR} />
          <P x={3} y={3} w={1} h={2} f={HAIR} />
          <P x={8} y={3} w={1} h={2} f={HAIR} />
        </>
      )}

      {/* olhos + boca */}
      {v !== "theo" && (
        <>
          <P x={5} y={4} w={1} h={1} f={EYE} />
          <P x={6} y={4} w={1} h={1} f={EYE} />
        </>
      )}
      <P x={5} y={5} w={2} h={1} f={MOUTH} />
    </svg>
  );
}

function variant(nome: string): Variant {
  const n = nome.toLowerCase();
  if (n.includes("caio")) return "caio";
  if (n.includes("davi")) return "davi";
  if (n.includes("theo")) return "theo";
  if (n.includes("mia")) return "mia";
  return "default";
}