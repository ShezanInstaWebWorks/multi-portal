"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical } from "lucide-react";

const COLUMNS = [
  { key: "todo",   label: "To do",     color: "var(--color-muted)" },
  { key: "doing",  label: "In progress", color: "var(--color-teal)" },
  { key: "review", label: "Review",     color: "var(--color-amber)" },
  { key: "done",   label: "Done",       color: "var(--color-green)" },
];

export function TaskBoard({ projectId, tasks: initial = [], canEdit = false }) {
  const [tasks, setTasks] = useState(initial);
  const router = useRouter();

  // Sync from server-prop on refresh
  if (initial !== tasks && initial.length !== tasks.length) {
    // basic diff — simpler than full reconciliation
    setTasks(initial);
  }

  async function patch(taskId, body) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...localOf(body) } : t)));
    await fetch(`/api/admin/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  async function del(taskId) {
    if (!confirm("Delete this task?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await fetch(`/api/admin/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" });
    router.refresh();
  }

  // For non-editors with zero tasks, show a single empty hint instead of 4 empty columns.
  if (!canEdit && tasks.length === 0) {
    return (
      <div className="bg-off rounded-[12px] border border-dashed border-border p-6 text-center text-[0.85rem] text-muted">
        No tasks yet — the admin team will break this project into tasks here.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {COLUMNS.map((col) => {
        const colTasks = tasks
          .filter((t) => t.status === col.key)
          .sort((a, b) => a.sort_order - b.sort_order);
        return (
          <div key={col.key} className="bg-off rounded-[12px] border border-border p-2.5 min-h-[160px]">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <span className="text-[0.78rem] font-bold text-dark">{col.label}</span>
                <span className="text-[0.7rem] text-muted">({colTasks.length})</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {colTasks.length === 0 ? (
                <div className="text-[0.75rem] text-muted text-center py-3">—</div>
              ) : (
                colTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    canEdit={canEdit}
                    onMove={(s) => patch(t.id, { status: s })}
                    onTitle={(title) => patch(t.id, { title })}
                    onDue={(dueDate) => patch(t.id, { dueDate: dueDate || null })}
                    onDelete={() => del(t.id)}
                  />
                ))
              )}
              {canEdit && <NewTaskInline projectId={projectId} status={col.key} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function localOf(body) {
  // Mirror server-side stamping for instant UI feedback
  const out = { ...body };
  if (body.status === "done") out.completed_at = new Date().toISOString();
  if (body.status && body.status !== "done") out.completed_at = null;
  return out;
}

function TaskCard({ task, canEdit, onMove, onTitle, onDue, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState(task.due_date ?? "");

  return (
    <div className="bg-white rounded-[10px] border border-border p-2.5 group hover:shadow-sm">
      <div className="flex items-start gap-2">
        {canEdit && <GripVertical className="w-3.5 h-3.5 text-muted mt-0.5 shrink-0 opacity-0 group-hover:opacity-50" />}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { setEditing(false); if (title !== task.title) onTitle(title); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.currentTarget.blur(); }
                if (e.key === "Escape") { setTitle(task.title); setEditing(false); }
              }}
              autoFocus
              className="w-full text-[0.85rem] font-semibold text-dark border border-teal rounded px-1.5 py-0.5 outline-none"
            />
          ) : (
            <div
              className={`text-[0.85rem] font-semibold text-dark ${canEdit ? "cursor-text" : ""}`}
              onClick={() => canEdit && setEditing(true)}
            >
              {task.title}
            </div>
          )}
          {task.description && (
            <div className="text-[0.72rem] text-muted mt-0.5 whitespace-pre-wrap">{task.description}</div>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {canEdit ? (
              <>
                <select
                  value={task.status}
                  onChange={(e) => onMove(e.target.value)}
                  className="text-[0.7rem] border border-border rounded px-1.5 py-0.5 bg-white"
                >
                  <option value="todo">To do</option>
                  <option value="doing">Doing</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
                <input
                  type="date"
                  value={due}
                  onChange={(e) => { setDue(e.target.value); onDue(e.target.value); }}
                  className="text-[0.7rem] border border-border rounded px-1.5 py-0.5"
                />
              </>
            ) : task.due_date ? (
              <span className="text-[0.7rem] text-muted">Due {task.due_date}</span>
            ) : null}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={onDelete}
            title="Delete task"
            className="opacity-0 group-hover:opacity-100 text-muted hover:text-red transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function NewTaskInline({ projectId, status }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    await fetch(`/api/admin/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), status }),
    });
    setBusy(false);
    setTitle("");
    setAdding(false);
    router.refresh();
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="text-[0.78rem] text-muted hover:text-dark py-1.5 px-2 inline-flex items-center gap-1.5"
      >
        <Plus className="w-3 h-3" /> Add task
      </button>
    );
  }
  return (
    <div className="bg-white rounded-[10px] border border-teal p-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") add();
          if (e.key === "Escape") { setTitle(""); setAdding(false); }
        }}
        placeholder="Task title…"
        className="w-full text-[0.85rem] outline-none border-none"
        disabled={busy}
      />
    </div>
  );
}
