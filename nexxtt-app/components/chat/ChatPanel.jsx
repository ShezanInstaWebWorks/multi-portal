"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, X, Download, FileText, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Realtime chat for a single conversation. Receives initial messages from the
// server and subscribes for INSERTs. Supports text + a single optional file
// attachment per message (max 10 MB).
//
// For project-tier conversations, pass `projectStatus` so the panel locks once
// the project is delivered/approved/cancelled. Reopening the project (admin
// flips status back to in_progress / revision_requested) restores chatting.
export function ChatPanel({
  conversationId,
  initialMessages = [],
  currentUserId,
  placeholder = "Write a message…",
  projectStatus = null,
  variant = "side", // "side" (right rail) or "wide" (full-width tab)
  readOnly = false, // true → observer view (no input); used for admin on project chat
  readOnlyLabel = "Read-only — only the agency and client can reply here",
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  const isLocked = projectStatus
    ? ["delivered", "approved", "cancelled"].includes(projectStatus)
    : false;
  const inputDisabled = isLocked || readOnly;

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!conversationId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  function pickFile(f) {
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setError("File too large (max 10 MB)");
      return;
    }
    setError(null);
    setPendingFile(f);
  }

  async function send(e) {
    e?.preventDefault?.();
    if (sending || inputDisabled) return;
    const text = draft.trim();
    if (!text && !pendingFile) return;
    if (!conversationId) return;

    setSending(true);
    setError(null);

    const fd = new FormData();
    fd.set("conversationId", conversationId);
    if (text) fd.set("body", text);
    if (pendingFile) fd.set("file", pendingFile);

    setDraft("");
    const fileSnap = pendingFile;
    setPendingFile(null);

    const res = await fetch("/api/messages", { method: "POST", body: fd });
    const payload = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setError(payload.error ?? `Send failed (${res.status})`);
      setDraft(text);
      setPendingFile(fileSnap);
      return;
    }
    // Optimistically add the message to local state. The realtime subscription
    // also dedupes by id, so this is safe even if the INSERT event arrives.
    if (payload?.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.message.id)) return prev;
        return [...prev, payload.message];
      });
    }
  }

  if (!conversationId) {
    return (
      <div className="rounded-[12px] border border-border bg-white p-4 text-[0.82rem] text-muted">
        Chat will appear here once a project request is filed.
      </div>
    );
  }

  const heightClass = variant === "wide"
    ? "min-h-[520px] max-h-[720px]"
    : "min-h-[420px] max-h-[640px]";

  return (
    <div className={`flex flex-col bg-white border border-border rounded-[12px] overflow-hidden ${heightClass}`}>
      <div
        className="px-4 py-2 text-[0.7rem] font-bold uppercase text-muted border-b border-border flex items-center justify-between"
        style={{ letterSpacing: "0.1em" }}
      >
        <span>Discussion</span>
        {isLocked && (
          <span className="normal-case tracking-normal text-[0.7rem] font-semibold text-amber">
            Project closed — read-only
          </span>
        )}
        {!isLocked && readOnly && (
          <span className="normal-case tracking-normal text-[0.7rem] font-semibold text-muted">
            Observer view
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {messages.length === 0 ? (
          <div className="text-[0.82rem] text-muted text-center py-6">No messages yet — say hi.</div>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} message={m} isMe={m.sender_id === currentUserId} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {!inputDisabled && (
        <form onSubmit={send} className="border-t border-border bg-off">
          {pendingFile && (
            <div className="px-3 pt-2 pb-1 flex items-center gap-2">
              <div className="flex-1 inline-flex items-center gap-2 bg-white border border-border rounded-[8px] px-2.5 py-1.5">
                <Paperclip className="w-3.5 h-3.5 text-teal" />
                <span className="text-[0.78rem] text-dark truncate">{pendingFile.name}</span>
                <span className="text-[0.7rem] text-muted">({formatBytes(pendingFile.size)})</span>
              </div>
              <button
                type="button"
                onClick={() => setPendingFile(null)}
                className="text-muted hover:text-red"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 px-3 py-2.5">
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-[8px] text-muted hover:text-teal hover:bg-white"
              title="Attach file"
              disabled={sending}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); }
              }}
              placeholder={placeholder}
              rows={1}
              className="flex-1 resize-none rounded-[8px] border border-border bg-white px-3 py-2 text-[0.85rem] outline-none focus:border-teal"
              style={{ maxHeight: 120 }}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || (!draft.trim() && !pendingFile)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[0.82rem] font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--color-teal)" }}
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? "…" : "Send"}
            </button>
          </div>
        </form>
      )}

      {isLocked && (
        <div className="border-t border-border bg-off px-4 py-3 text-[0.78rem] text-muted text-center">
          This project is {projectStatus}. Reopen it to continue the discussion.
        </div>
      )}

      {!isLocked && readOnly && (
        <div className="border-t border-border bg-off px-4 py-3 text-[0.78rem] text-muted text-center">
          {readOnlyLabel}
        </div>
      )}

      {error && (
        <div className="px-3 py-1.5 text-[0.75rem] text-red bg-red/5 border-t border-red/20">
          {error}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, isMe }) {
  const time = new Date(message.created_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  const roleLabel = ROLE_LABEL[message.sender_role] ?? message.sender_role;
  const hasAttachment = !!message.attachment_path;

  return (
    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
      <div
        className="max-w-[85%] rounded-[12px] px-3 py-2 text-[0.85rem] leading-relaxed whitespace-pre-wrap"
        style={{
          background: isMe ? "var(--color-teal)" : "var(--color-off)",
          color: isMe ? "var(--color-navy)" : "var(--color-dark)",
          border: isMe ? "none" : "1px solid var(--color-border)",
        }}
      >
        {message.body && <div>{message.body}</div>}
        {hasAttachment && (
          <Attachment messageId={message.id} message={message} isMe={isMe} hasBody={!!message.body} />
        )}
      </div>
      <div className="text-[0.65rem] text-muted mt-0.5 px-1">
        {roleLabel} · {time}
      </div>
    </div>
  );
}

function Attachment({ messageId, message, isMe, hasBody }) {
  const [signed, setSigned] = useState(null);
  const [loading, setLoading] = useState(false);
  const isImage = (message.attachment_mime ?? "").startsWith("image/");

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/messages/${messageId}/attachment`);
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) setSigned(data.url);
    })();
    return () => { cancelled = true; };
  }, [isImage, messageId]);

  async function download() {
    if (loading) return;
    setLoading(true);
    const res = await fetch(`/api/messages/${messageId}/attachment`);
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank", "noopener");
  }

  return (
    <div className={hasBody ? "mt-2" : ""}>
      {isImage && signed ? (
        <a href={signed} target="_blank" rel="noopener" className="block">
          <img
            src={signed}
            alt={message.attachment_name ?? ""}
            className="max-w-full rounded-[8px] border border-border"
            style={{ maxHeight: 240 }}
          />
        </a>
      ) : (
        <button
          onClick={download}
          className="inline-flex items-center gap-2 rounded-[8px] px-2.5 py-1.5"
          style={{
            background: isMe ? "rgba(11,31,58,0.12)" : "white",
            border: `1px solid ${isMe ? "rgba(11,31,58,0.25)" : "var(--color-border)"}`,
            color: isMe ? "var(--color-navy)" : "var(--color-dark)",
          }}
          title="Download attachment"
        >
          {isImage ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
          <span className="text-[0.78rem] font-semibold truncate max-w-[180px]">
            {message.attachment_name ?? "Attachment"}
          </span>
          <span className="text-[0.7rem] opacity-70">{formatBytes(message.attachment_size)}</span>
          <Download className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function formatBytes(n) {
  if (!Number.isFinite(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const ROLE_LABEL = {
  agency_client: "Client",
  agency: "Agency",
  direct_client: "You",
  admin: "nexxtt Admin",
};
