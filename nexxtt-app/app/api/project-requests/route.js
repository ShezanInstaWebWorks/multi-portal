import crypto from "node:crypto";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { notifyForRequest } from "@/lib/request-notifications";

// POST /api/project-requests
//
// Accepts either JSON or multipart/form-data. Multipart is required when the
// caller wants to attach reference files. Field names match the JSON keys;
// `files` (repeated) carries the uploads, max 5 × 10 MB each.
//
// Body fields:
//   title           — required (>=2 chars)
//   description?    — string, optional
//   proposedAmountCents — required, > 0
//   proposedDeliveryDate? — "YYYY-MM-DD"
//   serviceId?      — single service uuid (legacy)
//   serviceIds?     — array of service uuids OR comma-joined string in multipart
//   clientId?       — required when initiator role is "agency"
//   directClientUserId? — required when initiator role is "admin"
//   files?          — multipart-only; reference attachments

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB per file
const MAX_ATTACHMENTS = 5;
const ATTACHMENT_BUCKET = "chat-attachments";  // re-used existing bucket

export async function POST(req) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in", code: "NO_SESSION" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, agency_id, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;
  if (!role || !["agency_client", "agency", "direct_client", "admin"].includes(role)) {
    return Response.json({ error: "Unsupported role", code: "ROLE" }, { status: 403 });
  }

  // Parse body — JSON or multipart
  const contentType = req.headers.get("content-type") ?? "";
  let body = {};
  let pendingFiles = [];
  if (contentType.startsWith("multipart/form-data")) {
    const form = await req.formData();
    body.title                = form.get("title") ?? null;
    body.description          = form.get("description") ?? null;
    body.proposedAmountCents  = form.get("proposedAmountCents") ?? null;
    body.proposedDeliveryDate = form.get("proposedDeliveryDate") ?? null;
    body.serviceId            = form.get("serviceId") ?? null;
    const sids = form.get("serviceIds");
    if (typeof sids === "string" && sids.length > 0) {
      body.serviceIds = sids.split(",").map((s) => s.trim()).filter(Boolean);
    }
    const pids = form.get("packageIds");
    if (typeof pids === "string" && pids.length > 0) {
      body.packageIds = pids.split(",").map((s) => s.trim()).filter(Boolean);
    }
    body.clientId             = form.get("clientId") ?? null;
    body.directClientUserId   = form.get("directClientUserId") ?? null;
    pendingFiles = form.getAll("files").filter((f) => f && typeof f !== "string");
  } else {
    try { body = await req.json(); }
    catch { return Response.json({ error: "Invalid JSON", code: "BAD_JSON" }, { status: 400 }); }
  }

  const {
    title,
    description,
    serviceId,
    serviceIds,
    packageIds,
    proposedAmountCents,
    proposedDeliveryDate,
    clientId,
    directClientUserId,
  } = body ?? {};

  if (!title || String(title).trim().length < 2) {
    return Response.json({ error: "Title is required", code: "VALIDATION" }, { status: 400 });
  }
  const amountParsed = Number(proposedAmountCents);
  if (!Number.isFinite(amountParsed) || amountParsed <= 0) {
    return Response.json({ error: "Suggested amount is required", code: "VALIDATION" }, { status: 400 });
  }
  const amount = Math.round(amountParsed);

  // Attachment validation up front so we don't insert a row then fail uploads.
  if (pendingFiles.length > MAX_ATTACHMENTS) {
    return Response.json({ error: `Max ${MAX_ATTACHMENTS} attachments per request`, code: "VALIDATION" }, { status: 400 });
  }
  for (const f of pendingFiles) {
    if (f.size > MAX_ATTACHMENT_BYTES) {
      return Response.json({ error: `File "${f.name}" is over 10 MB`, code: "VALIDATION" }, { status: 400 });
    }
  }

  // Normalise package + service id lists. If packageIds is provided, derive
  // service_ids from the packages' service_id column (so a request always
  // carries both for back-compat with code that reads service_id/service_ids).
  let packageIdList = Array.isArray(packageIds)
    ? packageIds.filter((s) => typeof s === "string" && s.length > 0)
    : [];
  packageIdList = [...new Set(packageIdList)];
  if (packageIdList.length > 20) {
    return Response.json({ error: "Too many packages (max 20)", code: "VALIDATION" }, { status: 400 });
  }

  let serviceIdList = [];
  if (packageIdList.length > 0) {
    const { data: pkgs } = await admin
      .from("service_packages")
      .select("id, service_id")
      .in("id", packageIdList);
    const found = new Map((pkgs ?? []).map((p) => [p.id, p.service_id]));
    if (found.size !== packageIdList.length) {
      return Response.json({ error: "One or more package ids are invalid", code: "VALIDATION" }, { status: 400 });
    }
    serviceIdList = [...new Set(packageIdList.map((id) => found.get(id)).filter(Boolean))];
  } else if (Array.isArray(serviceIds)) {
    serviceIdList = [...new Set(serviceIds.filter((s) => typeof s === "string" && s.length > 0))];
  } else if (serviceId && typeof serviceId === "string") {
    serviceIdList = [serviceId];
  }
  if (serviceIdList.length > 20) {
    return Response.json({ error: "Too many services (max 20)", code: "VALIDATION" }, { status: 400 });
  }

  // Determine initial status based on role
  // Agency client requests go to agency partner first (pending_agency_review)
  // Direct client requests go to admin (pending_admin_approval)
  let initialStatus = "pending_counterparty";
  if (role === "agency_client") {
    initialStatus = "pending_agency_review";
  } else if (role === "direct_client") {
    initialStatus = "pending_admin_approval";
  }

  const baseRow = {
    initiator_user_id: user.id,
    initiator_role: role,
    title: String(title).trim().slice(0, 200),
    description: typeof description === "string" ? description.trim() || null : null,
    proposed_amount_cents: amount,
    status: initialStatus,
    service_id: serviceIdList[0] ?? null,
    service_ids: serviceIdList,
    package_ids: packageIdList,
  };
  if (typeof proposedDeliveryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(proposedDeliveryDate)) {
    baseRow.proposed_delivery_date = proposedDeliveryDate;
  }

  // Resolve tier + scope from the initiator's role
  if (role === "agency_client") {
    const { data: myClient } = await admin
      .from("clients")
      .select("id, agency_id")
      .eq("portal_user_id", user.id)
      .maybeSingle();
    if (!myClient) {
      return Response.json({ error: "No client record for this user", code: "NO_CLIENT" }, { status: 400 });
    }
    baseRow.client_id = myClient.id;
    baseRow.agency_id = myClient.agency_id;
  } else if (role === "agency") {
    if (!clientId) {
      return Response.json({ error: "clientId required", code: "VALIDATION" }, { status: 400 });
    }
    const { data: c } = await admin
      .from("clients")
      .select("id, agency_id")
      .eq("id", clientId)
      .maybeSingle();
    if (!c || c.agency_id !== profile.agency_id) {
      return Response.json({ error: "Client not in your agency", code: "FORBIDDEN" }, { status: 403 });
    }
    baseRow.client_id = c.id;
    baseRow.agency_id = c.agency_id;
  } else if (role === "direct_client") {
    baseRow.direct_client_user_id = user.id;
  } else if (role === "admin") {
    if (!directClientUserId) {
      return Response.json({ error: "directClientUserId required", code: "VALIDATION" }, { status: 400 });
    }
    baseRow.direct_client_user_id = directClientUserId;
  }

  // Insert the row first so we have an id to use as the storage path prefix.
  const { data: inserted, error: insertErr } = await admin
    .from("project_requests")
    .insert(baseRow)
    .select("*")
    .single();
  if (insertErr) {
    return Response.json({ error: insertErr.message, code: "INSERT_ERROR" }, { status: 500 });
  }

  // Upload attachments and patch the row with the metadata array. If any
  // upload fails we delete the request row + already-uploaded files so the
  // operation is all-or-nothing.
  if (pendingFiles.length > 0) {
    const uploaded = [];
    for (const f of pendingFiles) {
      const safeName = sanitizeFilename(f.name || "file");
      const path = `request/${inserted.id}/${crypto.randomUUID()}-${safeName}`;
      const buf = Buffer.from(await f.arrayBuffer());
      const { error: upErr } = await admin.storage.from(ATTACHMENT_BUCKET).upload(path, buf, {
        contentType: f.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) {
        for (const u of uploaded) {
          await admin.storage.from(ATTACHMENT_BUCKET).remove([u.path]).catch(() => {});
        }
        await admin.from("project_requests").delete().eq("id", inserted.id);
        return Response.json(
          { error: `Upload failed for "${f.name}": ${upErr.message}`, code: "UPLOAD_ERROR" },
          { status: 500 }
        );
      }
      uploaded.push({ path, name: safeName, size: f.size, mime: f.type || "application/octet-stream" });
    }
    const { data: patched, error: patchErr } = await admin
      .from("project_requests")
      .update({ attachments: uploaded })
      .eq("id", inserted.id)
      .select("*")
      .single();
    if (patchErr) {
      // Roll back the uploads — DB row is already inserted but without
      // attachments. We could leave it and accept the orphan files, but a
      // hard failure here means something is very wrong with the row, so
      // bail loudly.
      for (const u of uploaded) {
        await admin.storage.from(ATTACHMENT_BUCKET).remove([u.path]).catch(() => {});
      }
      return Response.json({ error: patchErr.message, code: "ATTACH_PATCH_ERROR" }, { status: 500 });
    }
    inserted.attachments = patched.attachments;
  }

  await notifyForRequest(admin, {
    request: inserted,
    actorRole: role,
    type: "request_new",
    title: `New project request — ${inserted.title}`,
    body: inserted.description ? inserted.description.slice(0, 140) : "Tap to review and respond.",
  });

  return Response.json({
    requests: [inserted],
    request: inserted,
  }, { status: 201 });
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}
