declare module "node:sqlite" {
  export interface StatementSync {
    run(...params: (string | number | bigint | null | Uint8Array)[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: (string | number | bigint | null | Uint8Array)[]): Record<string, unknown> | undefined;
    all(...params: (string | number | bigint | null | Uint8Array)[]): Record<string, unknown>[];
  }
  export class DatabaseSync {
    constructor(path: string, options?: Record<string, unknown>);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
