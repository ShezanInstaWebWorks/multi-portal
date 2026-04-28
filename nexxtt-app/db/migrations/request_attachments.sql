-- Attachments for project requests. Stored on `project_requests.attachments`
-- as a small JSONB array — each element is metadata pointing at a file in the
-- existing `chat-attachments` storage bucket under the path prefix
-- `request/<request_id>/<uuid>-<filename>`.
--
-- Element shape:
--   { "path": "request/<rid>/<uuid>-<filename>",
--     "name": "<original filename>",
--     "size": <bytes>,
--     "mime": "<mime/type>" }
--
-- Apply via Supabase dashboard → SQL editor. Idempotent.

alter table project_requests
  add column if not exists attachments jsonb default '[]'::jsonb not null;

-- Cheap GIN index so future queries like "requests with attachments" can scan
-- without a sequential read.
create index if not exists idx_project_requests_attachments
  on project_requests using gin (attachments);
