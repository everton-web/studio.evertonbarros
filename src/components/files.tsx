"use client";

import { useEffect, useState, useRef } from "react";

type FileInfo = { name: string; size: number; modified: string; ext: string };
const IMG = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

const fmtSize = (n: number) =>
  n > 1024 * 1024 ? (n / 1048576).toFixed(1) + " MB" : n > 1024 ? Math.round(n / 1024) + " KB" : n + " B";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function Files() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const r = await fetch("/api/files");
    if (r.ok) setFiles((await r.json()).files);
  }
  useEffect(() => { refresh(); }, []);

  async function upload(filesList: FileList | File[]) {
    setBusy(true);
    try {
      for (const f of Array.from(filesList)) {
        const fd = new FormData();
        fd.append("file", f);
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        if (!r.ok) alert("erro ao subir: " + f.name);
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(name: string) {
    if (!confirm(`Apagar "${name}"?`)) return;
    await fetch("/api/file/" + encodeURIComponent(name), { method: "DELETE" });
    refresh();
  }

  return (
    <div>
      {/* drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
          dragging ? "border-[#FF4000] bg-[#FF4000]/8" : "border-white/12 hover:border-white/25"
        }`}
      >
        <div className="text-[2rem] mb-3">⬆</div>
        {busy ? (
          <p className="text-[.9rem] text-[#b8b8b3]">Enviando…</p>
        ) : (
          <>
            <p className="text-[.95rem] font-medium tracking-tight">Solte arquivos aqui</p>
            <p className="mono mt-2" style={{ fontSize: "0.66rem" }}>ou clique para selecionar · fotos, planilhas, pdf, texto · máx 25MB</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) upload(e.target.files); e.target.value = ""; }}
      />

      {/* lista */}
      {files.length > 0 && (
        <div className="mt-8 flex items-baseline justify-between">
          <h3 className="mono" style={{ fontSize: "0.7rem" }}>Enviados · {files.length}</h3>
          <span className="mono" style={{ fontSize: "0.66rem" }}>salvos no vault · _Arquivos/</span>
        </div>
      )}
      <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
        {files.map((f) => (
          <div key={f.name} className="relative group bg-[var(--bg-2)] border border-[var(--line)] rounded-xl overflow-hidden hover:border-white/20 transition-colors">
            {IMG.has(f.ext) ? (
              <a href={"/api/file/" + encodeURIComponent(f.name)} target="_blank" rel="noreferrer">
                <img
                  src={"/api/file/" + encodeURIComponent(f.name)}
                  alt={f.name}
                  className="w-full h-28 object-cover bg-[#111]"
                  loading="lazy"
                />
              </a>
            ) : (
              <a
                href={"/api/file/" + encodeURIComponent(f.name)}
                target="_blank"
                rel="noreferrer"
                className="h-28 grid place-items-center bg-[#111] text-[#8a8a85]"
              >
                <span className="font-mono text-[.75rem] border border-white/15 rounded-lg px-3 py-1.5 uppercase">{f.ext || "file"}</span>
              </a>
            )}
            <div className="p-3">
              <div className="text-[.72rem] text-[#d8d8d3] leading-snug break-all line-clamp-2" title={f.name}>{f.name}</div>
              <div className="mono mt-1.5 flex justify-between" style={{ fontSize: "0.7rem" }}>
                <span className="text-[#8a8a85]">{fmtSize(f.size)}</span>
                <span className="text-[#4a4a47]">{fmtDate(f.modified)}</span>
              </div>
            </div>
            <button
              onClick={() => remove(f.name)}
              className="absolute top-2 right-2 w-6 h-6 grid place-items-center rounded-md bg-black/60 text-white/70 text-[.7rem] opacity-0 group-hover:opacity-100 hover:bg-[#FF4000] hover:text-white transition-all"
              title="apagar"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {files.length === 0 && (
        <p className="mono mt-6 text-center" style={{ fontSize: "0.66rem" }}>nenhum arquivo ainda: tudo aqui fica guardado no vault</p>
      )}
    </div>
  );
}