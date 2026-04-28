-- Multi-service project requests.
-- One project_request can now bundle multiple services. The legacy
-- `service_id` column stays (set to the first service in the array) so older
-- queries keep working. New code reads `service_ids` and treats it as the
-- source of truth.
--
-- Apply via Supabase dashboard → SQL editor (or psql). Idempotent — safe to
-- re-run.

alter table project_requests
  add column if not exists service_ids uuid[] default '{}'::uuid[] not null;

-- Backfill existing rows: an existing single service becomes a 1-element array.
update project_requests
   set service_ids = array[service_id]
 where service_id is not null
   and (service_ids is null or array_length(service_ids, 1) is null);

-- Helper view: when admin needs to display the resolved services list for a
-- request, they can select-join via this view in one round-trip.
create or replace view project_request_services as
  select pr.id as request_id,
         s.id as service_id,
         s.name,
         s.icon,
         s.slug,
         s.cost_price_cents,
         s.default_retail_cents,
         s.sort_order
    from project_requests pr,
         unnest(pr.service_ids) as sid
    join services s on s.id = sid
   order by s.sort_order;
