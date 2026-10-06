import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listarPorEstagio } from "@/lib/data";

// Comercial sobre o mesmo modelo de empresa: lead e oportunidade.
// Quem virou cliente vive em /api/clientes e nunca aparece aqui.
export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  try {
    const leads = (await listarPorEstagio(["lead", "oportunidade"])).map((e) => ({
      id: e.id,
      nome: e.nome,
      segmento: e.segmento,
      cidade: e.cidade,
      site: e.site,
      estagio_crm: e.estagio_crm,
      estagio_funil: e.estagio_funil,
      status: e.status,
    }));
    const porEstagio = { lead: 0, oportunidade: 0 };
    for (const l of leads) porEstagio[l.estagio_crm as "lead" | "oportunidade"]++;
    return NextResponse.json({ leads, porEstagio }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "falha ao ler o comercial" }, { status: 500 });
  }
}
