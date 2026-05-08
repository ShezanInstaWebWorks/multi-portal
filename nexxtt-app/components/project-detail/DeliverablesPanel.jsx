"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Download, Upload, Trash2, File as FileIcon, Send } from "lucide-react";

const MAX_BYTES = 50 * 1024 * 1024;

const FLOWS = {
  "website-design": [
    { key: "in_progress", label: "Wireframes" },
    { key: "in_progress_design", label: "Visual Design" },
    { key: "delivered", label: "Final Deliverables" },
  ],
  "logo-design": [
    { key: "in_progress", label: "3 Concepts" },
    { key: "revision_requested", label: "Refinement" },
    { key: "delivered", label: "Final Files" },
  ],
  "brand-guidelines": [
    { key: "in_progress", label: "Moodboard" },
    { key: "in_review", label: "System Review" },
    { key: "delivered", label: "Brand Bible" },
  ],
  "social-media-pack": [
    { key: "in_progress", label: "Draft Posts" },
    { key: "in_review", label: "Approved Posts" },
    { key: "delivered", label: "Published" },
  ],
  "content-writing": [
    { key: "in_progress", label: "Draft" },
    { key: "revision_requested", label: "Edits" },
    { key: "delivered", label: "Final Copy" },
  ],
};

function getStageOptions(serviceSlug) {
  return FLOWS[serviceSlug] ?? FLOWS["website-design"];
}

export function DeliverablesPanel({ projectId, initialFiles, canUpload, currentStatus, serviceSlug }) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedStage, setSelectedStage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendNote, setSendNote] = useState("");

  const stageOptions = getStageOptions(serviceSlug);

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
      if (selectedStage) body.append("stage", selectedStage);
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
  }, [canUpload, projectId, router, selectedStage]);

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

  async function sendForReview() {
    setSending(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/submit-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: sendNote.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not submit for review");
      return;
    }
    router.refresh();
  }

  const canSend = canUpload && files.length > 0 && currentStatus !== "agency_review" && currentStatus !== "in_review";

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
        <>
          <div className="flex items-center gap-2 mb-3">
            <label className="text-[0.78rem] font-semibold text-muted shrink-0">Stage:</label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="flex-1 px-3 py-1.5 text-[0.82rem] border border-border rounded-[8px] outline-none focus:border-teal bg-white"
            >
              <option value="">Select stage…</option>
              {stageOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>

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
        </>
      )}

      {error && (
        <div
          className="text-[0.78rem] rounded-[8px] px-3 py-2 mt-3 mb-1"
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
                  {f.stage && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[0.65rem] font-semibold bg-teal-pale text-teal mr-2">
                      {stageOptions.find((s) => s.key === f.stage)?.label ?? f.stage.replace(/_/g, " ")}
                    </span>
                  )}
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

      {canSend && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="mb-3">
            <label className="text-[0.78rem] font-semibold text-muted mb-1.5 block">Note (optional)</label>
            <textarea
              value={sendNote}
              onChange={(e) => setSendNote(e.target.value)}
              rows={3}
              placeholder="Add a note about these deliverables…"
              className="w-full px-3 py-2 text-[0.82rem] border border-border rounded-[8px] outline-none resize-none focus:border-teal"
            />
          </div>
          <button
            onClick={sendForReview}
            disabled={sending || !selectedStage}
            className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-[10px] text-sm font-semibold text-white disabled:opacity-40"
            style={{
              background: "var(--color-teal)",
              boxShadow: "0 2px 10px rgba(0,184,169,0.25)",
            }}
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? "Sending…" : "Send to agency for review"}
          </button>
          {!selectedStage && (
            <p className="text-[0.72rem] text-muted mt-2 text-center">
              Select a stage above before sending.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
