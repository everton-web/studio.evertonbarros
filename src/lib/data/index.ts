// Camada única de dados da plataforma (Supabase Postgres e Storage, só no servidor).
// Rotas e páginas importam daqui; nada fora de src/lib/data fala com o Supabase.
export * from "./agentes";
export * from "./analises";
export * from "./arquivos";
export * from "./briefings";
export * from "./campanhas";
export * from "./clientes";
export * from "./contratos";
export * from "./credenciais";
export * from "./documentos";
export * from "./empresas";
export * from "./leads";
export * from "./rastreamento";
export * from "./relatorios";
export * from "./reunioes";
export * from "./saude";
export * from "./workspace";
