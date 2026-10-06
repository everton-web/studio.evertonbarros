import type { Metadata } from "next";
import { briefingPorToken } from "@/lib/data";
import { BriefingForm } from "./form";

export const metadata: Metadata = {
  title: "Briefing do seu site",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await briefingPorToken(token);
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 64px" }}>
      {!info ? (
        <>
          <h1 className="text-balance" style={{ fontSize: "1.5rem", fontWeight: 600 }}>Este link não é válido</h1>
          <p style={{ color: "var(--muted)", marginTop: 12 }}>Peça um novo link a quem enviou este briefing.</p>
        </>
      ) : info.respondido ? (
        <>
          <h1 className="text-balance" style={{ fontSize: "1.5rem", fontWeight: 600 }}>Briefing já respondido</h1>
          <p style={{ color: "var(--muted)", marginTop: 12 }}>Obrigado! Recebemos as suas respostas e vamos seguir com o projeto.</p>
        </>
      ) : (
        <>
          <p className="mono" style={{ marginBottom: 12 }}>Briefing do site</p>
          <h1 className="text-balance" style={{ fontSize: "1.6rem", fontWeight: 600, letterSpacing: "-.02em" }}>
            {info.empresa ? `Vamos conhecer a ${info.empresa}` : "Vamos conhecer o seu negócio"}
          </h1>
          <p style={{ color: "var(--muted)", margin: "12px 0 28px", lineHeight: 1.6 }}>
            Responda com calma e do seu jeito. Não existe resposta certa, quanto mais detalhe, melhor o site.
          </p>
          <BriefingForm token={token} />
        </>
      )}
    </main>
  );
}
