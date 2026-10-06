// Publicação do relatório público do lead. Antes commitava o JSON em dois
// repositórios git; agora marca a linha de reports (kind lead_publico) como
// publicada e o site passa a recebê-la em GET /api/relatorio/publico/<slug>.
import { publicarRelatorioLead } from "@/lib/data";

export async function publicarRelatorio(slug: string): Promise<{ publicado: boolean }> {
  const publicado = await publicarRelatorioLead(slug);
  if (!publicado) throw new Error("relatório não encontrado para publicar");
  return { publicado };
}
