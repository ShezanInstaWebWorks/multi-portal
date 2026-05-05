"use client";

import { useRef, useState } from "react";
import { Paperclip, X, Upload, Loader2 } from "lucide-react";

const MAX_MB = 20;
const MAX_FILES = 8;
const ACCEPT = "*/*";

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function OrderAttachments({ attachments, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFiles(files) {
    const remaining = MAX_FILES - attachments.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    setError(null);

    const results = [];
    for (const file of toUpload) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`"${file.name}" exceeds the ${MAX_MB} MB limit.`);
        continue;
      }
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/order-attachments", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        continue;
      }
      results.push(data);
    }

    if (results.length > 0) {
      onChange([...attachments, ...results]);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(path) {
    onChange(attachments.filter((a) => a.path !== path));
  }

  function onInputChange(e) {
    if (e.target.files?.length) uploadFiles(e.target.files);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  }

  return (
    <div className="mt-6 mb-2">
      <div className="flex items-center gap-2 mb-2">
        <Paperclip className="w-4 h-4 text-muted" />
        <span className="text-[0.85rem] font-semibold text-dark">Reference files</span>
        <span className="text-[0.72rem] text-muted">(optional · max {MAX_MB} MB each · up to {MAX_FILES} files)</span>
      </div>

      {/* Existing attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          {attachments.map((a) => (
            <div
              key={a.path}
              className="flex items-center gap-3 px-3 py-2 bg-off border border-border rounded-[8px]"
            >
              <div className="w-6 h-6 rounded flex items-center justify-center text-[0.85rem] shrink-0" style={{ background: "var(--color-teal-pale)" }}>
                📎
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.82rem] font-semibold text-dark truncate">{a.name}</div>
                <div className="text-[0.68rem] text-muted">{fmtSize(a.size)}</div>
              </div>
              <button
                type="button"
                onClick={() => remove(a.path)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-red/10 text-muted hover:text-red transition-colors shrink-0"
                aria-label="Remove file"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {attachments.length < MAX_FILES && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-[10px] cursor-pointer transition-colors ${
            dragOver
              ? "border-teal bg-teal-pale"
              : "border-border hover:border-teal hover:bg-off"
          }`}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 text-teal animate-spin shrink-0" />
          ) : (
            <Upload className="w-4 h-4 text-muted shrink-0" />
          )}
          <span className="text-[0.82rem] text-muted">
            {uploading
              ? "Uploading…"
              : dragOver
              ? "Drop files here"
              : "Click to attach files, or drag & drop"}
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            onChange={onInputChange}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <div className="mt-2 text-[0.78rem] text-red">{error}</div>
      )}
    </div>
  );
}
