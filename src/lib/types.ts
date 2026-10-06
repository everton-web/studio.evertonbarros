export type Item = { done: boolean; text: string };
export type Col = { nome: string; itens: Item[] };
export type Section = { h: string; html: string };
export type Agente = { nome: string; departamento: string; comando: string; html: string };
export type Data = {
  placar: { progresso: number; acumulado: number; meta: number; fase: string };
  comando: Section[];
  inbox: Section[];
  backlog: Section[];
  kanban: Col[];
  agentes: Agente[];
};