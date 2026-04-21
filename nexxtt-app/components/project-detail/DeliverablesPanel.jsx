"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Download, Upload, Trash2, File as FileIcon } from "lucide-react";

const MAX_BYTES = 50 * 1024 * 1024;

/**
 * Deliverables section — replaces the stub in ProjectDetailView.
 * Agency + admin see an upload dropzone. Everyone sees the file list with
 * a 24 h signed URL download link.
 */
export function DeliverablesPanel({ projectId, initialFiles, canUpload }) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const onDrop = useCallback(async (accepted) => {
    if (!canUpload || accepted.length === 0) return;
    setError(null);
    setUploading(true);
    for (const f of accepted) {
      if (f.size > MAX_BYTES) {
        setError(`${f.name} is larger than ${MAX_BYTES / 1024 / 1024} MB.`);
        continue;
      }
      const body = new FormData();
      body.append("file", f);
      const res = await fetch(`/api/projects/${projectId}/files`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Upload failed for ${f.name}`);
        continue;
      }
      if (data.file) setFiles((prev) => [data.file, ...prev]);
    }
    setUploading(false);
    router.refresh();
  }, [canUpload, projectId, router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_BYTES,
    disabled: !canUpload || uploading,
  });

  async function remove(f) {
    if (!confirm(`Remove ${f.name}? This can't be undone.`)) return;
    setDeletingId(f.id);
    const res = await fetch(`/api/projects/${projectId}/files/${f.id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Delete failed");
      return;
    }
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
    router.refresh();
  }

  return (
    <section className="bg-white border border-border rounded-[16px] p-5 shadow-sm">
      <header className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-display text-[0.95rem] font-extrabold text-dark">
          Deliverables
        </h2>
        {files.length > 0 && (
          <span className="text-[0.72rem] text-muted">
            {files.length} file{files.length === 1 ? "" : "s"}
          </span>
        )}
      </header>

      {canUpload && (
        <div
          {...getRootProps()}
          className={`rounded-[12px] p-5 mb-3 cursor-pointer text-center transition-colors ${
            isDragActive
              ? "bg-teal-pale"
              : "hover:bg-off"
          }`}
          style={{
            border: `1.5px dashed ${isDragActive ? "var(--color-teal)" : "var(--color-border)"}`,
          }}
        >
          <input {...getInputProps()} />
          <Upload className="w-5 h-5 text-muted mx-auto mb-1.5" />
          <div className="text-[0.82rem] font-semibold text-dark">
            {isDragActive ? "Drop here…" : uploading ? "Uploading…" : "Drop files or click to browse"}
          </div>
          <div className="text-[0.72rem] text-muted mt-1">
            Up to 50 MB per file · any format
          </div>
        </div>
      )}

      {error && (
        <div
          className="text-[0.78rem] mb-3 rounded-[8px] px-3 py-2"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "var(--color-red)",
          }}
        >
          {error}
        </div>
      )}

      {files.length === 0 ? (
        !canUpload && (
          <div className="py-6 text-center text-sm text-muted">
            <div className="text-2xl mb-2 opacity-30">📦</div>
            No files yet — they&apos;ll appear here once the project is delivered.
          </div>
        )
      ) : (
        <div className="flex flex-col gap-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 p-3 rounded-[10px] border border-border hover:border-teal/50 transition-colors"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--color-teal-pale)", color: "var(--color-teal)" }}
              >
                <FileIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.85rem] font-semibold text-dark truncate">
                  {f.name}
                </div>
                <div className="text-[0.72rem] text-muted">
                  {f.size_bytes ? `${Math.round(f.size_bytes / 1024)} KB` : ""}
                  {f.size_bytes ? " · " : ""}
                  {new Date(f.uploaded_at).toLocaleDateString("en-AU", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </div>
              </div>
              {f.url ? (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={f.name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.72rem] font-semibold bg-off text-body hover:bg-lg"
                >
                  <Download className="w-3 h-3" />
                  Download
                </a>
              ) : (
                <span className="text-[0.72rem] text-muted">link expired</span>
              )}
              {canUpload && (
                <button
                  onClick={() => remove(f)}
                  disabled={deletingId === f.id}
                  className="inline-flex items-center px-2 py-1 rounded-md text-[0.72rem] text-red hover:bg-red/10 disabled:opacity-60"
                  aria-label="Remove file"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
