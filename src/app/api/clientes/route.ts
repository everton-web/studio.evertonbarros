import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import {
  cofreConfigurado,
  criarBriefing,
  criarClienteNovo,
  detalheCliente,
  editarCliente,
  gerarContrato,
  gravarCredencial,
  lerCredencial,
  listarClientes,
  removerContrato,
  removerCredencial,
  resumoClientes,
  textoDoContrato,
} from "@/lib/data";
import { lerValor } from "@/lib/formato";

const SEM_CACHE = { "Cache-Control": "no-store" };
const nao = () => NextResponse.json({ error: "não autenticado" }, { status: 401 });
const txt = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

// Lista de clientes (cards), detalhe (?id=) e texto de contrato (?id=&contrato=).
// Nunca devolve senha: a senha só sai pelo POST "revelar".
export async function GET(req: Request) {
  if (!(await isAuthed())) return nao();
  const u = new URL(req.url);
  const id = u.searchParams.get("id");
  const contrato = u.searchParams.get("contrato");
  try {
    if (id && contrato) {
      const texto = await textoDoContrato(id, contrato);
      if (texto === null) return NextResponse.json({ error: "contrato não encontrado" }, { status: 404 });
      return NextResponse.json({ texto }, { headers: SEM_CACHE });
    }
    if (id) {
      const d = await detalheCliente(id);
      if (!d) return NextResponse.json({ error: "cliente não encontrado" }, { status: 404 });
      return NextResponse.json({ cliente: d }, { headers: SEM_CACHE });
    }
    const clientes = await listarClientes();
    return NextResponse.json({ clientes, resumo: resumoClientes(clientes) }, { headers: SEM_CACHE });
  } catch {
    return NextResponse.json({ error: "falha ao ler clientes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return nao();
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "json inválido" }, { status: 400 });
  }
  const acao = txt(b.action, 40);
  const id = txt(b.id, 120);
  try {
    if (acao === "criar") {
      const nome = txt(b.nome);
      if (!nome) return NextResponse.json({ ok: false, error: "nome ausente" }, { status: 400 });
      const r = await criarClienteNovo({
        nome,
        segmento: txt(b.segmento),
        cidade: txt(b.cidade),
        site: txt(b.site),
        valor_projeto: lerValor(txt(b.valor_projeto, 30)),
        recorrencia: lerValor(txt(b.recorrencia, 30)),
      });
      return NextResponse.json({ ok: true, id: r.id }, { status: 201 });
    }
    if (!id) return NextResponse.json({ ok: false, error: "cliente ausente" }, { status: 400 });

    if (acao === "editar") {
      const campos: Record<string, string | number | null> = {};
      if (b.nome !== undefined && txt(b.nome)) campos.nome = txt(b.nome);
      for (const k of ["segmento", "cidade", "site"] as const) if (b[k] !== undefined) campos[k] = txt(b[k]) || null;
      if (b.valor_projeto !== undefined) campos.valor_projeto = lerValor(txt(b.valor_projeto, 30));
      if (b.recorrencia !== undefined) campos.recorrencia = lerValor(txt(b.recorrencia, 30));
      const ok = await editarCliente(id, campos);
      return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
    }
    if (acao === "briefing") {
      return NextResponse.json({ ok: true, briefing: await criarBriefing(id) });
    }
    if (acao === "contrato") {
      const c = await gerarContrato(id, {
        valor: b.valor !== undefined ? lerValor(txt(b.valor, 30)) : undefined,
        tipo_pagamento: txt(b.tipo_pagamento, 20) || "pix",
        parcelas: Number(b.parcelas) > 1 ? Math.min(60, Number(b.parcelas)) : null,
        inicio: /^\d{4}-\d{2}-\d{2}$/.test(txt(b.inicio, 10)) ? txt(b.inicio, 10) : undefined,
        duracao_meses: Number(b.duracao_meses) > 0 ? Math.min(60, Number(b.duracao_meses)) : null,
      });
      return NextResponse.json({ ok: true, contrato: c }, { status: 201 });
    }
    if (acao === "remover-contrato") {
      const ok = await removerContrato(id, txt(b.contrato, 80));
      return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
    }

    // ----- cofre: nada aqui vai para log; a senha só sai em "revelar" -----
    if (acao === "credencial") {
      if (!cofreConfigurado()) return NextResponse.json({ ok: false, error: "cofre sem chave configurada" }, { status: 503 });
      const label = txt(b.label, 80);
      const senha = String(b.senha ?? "");
      if (!label || !senha) return NextResponse.json({ ok: false, error: "rótulo e senha são obrigatórios" }, { status: 400 });
      const r = await gravarCredencial(id, {
        label,
        url: txt(b.url) || null,
        usuario: txt(b.usuario) || null,
        senha,
        notas: txt(b.notas, 500) || null,
      });
      return NextResponse.json({ ok: true, id: r.id }, { status: 201, headers: SEM_CACHE });
    }
    if (acao === "revelar") {
      if (!cofreConfigurado()) return NextResponse.json({ ok: false, error: "cofre sem chave configurada" }, { status: 503 });
      const c = await lerCredencial(txt(b.credencial, 80));
      if (!c || c.empresa_id !== id) return NextResponse.json({ ok: false, error: "credencial não encontrada" }, { status: 404 });
      return NextResponse.json({ ok: true, usuario: c.usuario, senha: c.senha }, { headers: SEM_CACHE });
    }
    if (acao === "remover-credencial") {
      const ok = await removerCredencial(txt(b.credencial, 80), id);
      return NextResponse.json({ ok }, { status: ok ? 200 : 404, headers: SEM_CACHE });
    }
    return NextResponse.json({ ok: false, error: "ação desconhecida" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "não foi possível concluir a ação" }, { status: 500 });
  }
}
