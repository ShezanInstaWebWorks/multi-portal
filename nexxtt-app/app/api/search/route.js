import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// GET /api/search?q=<query>
//
// Role-scoped global search:
//   agency         → jobs + clients + services
//   agency_client  → own jobs only + services
//   direct_client  → own jobs + services
//   referral_partner → own referrals (by referred user name) + services
//   admin          → all jobs + agencies + clients + referral_partners + services
//
// Returns up to 6 results per group. Substring match; Postgres `ilike`.
export async function GET(req) {
  const url = new URL(req.url);
  const qRaw = (url.searchParams.get("q") ?? "").trim();
  if (qRaw.length < 1) return Response.json({ groups: [] });

  const q = qRaw.slice(0, 64);
  const like = `%${q}%`;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  const agencyId = profile?.agency_id;
  const groups = [];

  // Services — always available for everyone (public read policy)
  const { data: services } = await supabase
    .from("services")
    .select("id, name, slug, icon")
    .ilike("name", like)
    .eq("is_active", true)
    .limit(6);
  if (services?.length) {
    groups.push({
      key: "services",
      label: "Services",
      items: services.map((s) => ({
        id: s.id,
        icon: s.icon,
        title: s.name,
        subtitle: `/${s.slug}`,
        href: role === "agency" || role === "admin" ? `/agency/orders/new` : null,
        meta: "Service",
      })),
    });
  }

  // Admin sees everything via service-role
  if (role === "admin") {
    const admin = createAdminSupabaseClient();

    const [jobsRes, agenciesRes, clientsRes, partnersRes, profilesRes] = await Promise.all([
      admin
        .from("jobs")
        .select("id, job_number, status, total_retail_cents, agency_id, client_id, direct_client_user_id")
        .ilike("job_number", like)
        .order("created_at", { ascending: false })
        .limit(6),
      admin.from("agencies").select("id, name, slug, status").ilike("name", like).limit(6),
      admin.from("clients").select("id, business_name, contact_name, agency_id, portal_slug").ilike("business_name", like).limit(6),
      admin.from("referral_partners").select("id, business_name, referral_code").ilike("business_name", like).limit(6),
      admin.from("user_profiles").select("id, first_name, last_name, role").or(`first_name.ilike.${like},last_name.ilike.${like}`).limit(6),
    ]);

    if (jobsRes.data?.length) {
      groups.push({
        key: "jobs",
        label: "Orders",
        items: jobsRes.data.map((j) => ({
          id: j.id,
          icon: "📋",
          title: j.job_number,
          subtitle: `${j.status}`,
          href: `/admin/orders?status=${j.status}`,
          meta: j.agency_id ? "Agency" : "Direct",
        })),
      });
    }
    if (agenciesRes.data?.length) {
      groups.push({
        key: "agencies",
        label: "Agencies",
        items: agenciesRes.data.map((a) => ({
          id: a.id,
          icon: "🏢",
          title: a.name,
          subtitle: `/${a.slug}`,
          href: `/admin/agencies`,
          meta: a.status,
        })),
      });
    }
    if (clientsRes.data?.length) {
      groups.push({
        key: "clients",
        label: "Clients",
        items: clientsRes.data.map((c) => ({
          id: c.id,
          icon: "👤",
          title: c.business_name,
          subtitle: c.contact_name,
          href: `/admin/clients`,
          meta: "Agency client",
        })),
      });
    }
    if (partnersRes.data?.length) {
      groups.push({
        key: "partners",
        label: "Referral partners",
        items: partnersRes.data.map((p) => ({
          id: p.id,
          icon: "🤝",
          title: p.business_name,
          subtitle: p.referral_code,
          href: `/admin/referrals`,
          meta: "Partner",
        })),
      });
    }
    if (profilesRes.data?.length) {
      groups.push({
        key: "users",
        label: "Users",
        items: profilesRes.data.map((u) => ({
          id: u.id,
          icon: "👥",
          title: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "(no name)",
          subtitle: u.role,
          href: u.role === "agency" ? "/admin/agencies" :
                u.role === "referral_partner" ? "/admin/referrals" :
                "/admin/clients",
          meta: u.role,
        })),
      });
    }
    return Response.json({ groups });
  }

  // Agency: jobs via agency_id + own clients
  if (role === "agency" && agencyId) {
    const [jobsRes, clientsRes] = await Promise.all([
      supabase
        .from("jobs")
        .select("id, job_number, status, total_retail_cents, client_id")
        .eq("agency_id", agencyId)
        .ilike("job_number", like)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("clients")
        .select("id, business_name, contact_name, portal_slug, portal_status")
        .eq("agency_id", agencyId)
        .ilike("business_name", like)
        .limit(6),
    ]);
    if (jobsRes.data?.length) {
      groups.push({
        key: "jobs",
        label: "Your orders",
        items: jobsRes.data.map((j) => ({
          id: j.id,
          icon: "📋",
          title: j.job_number,
          subtitle: j.status.replace(/_/g, " "),
          href: `/agency/orders/${j.id}`,
          meta: "Order",
        })),
      });
    }
    if (clientsRes.data?.length) {
      groups.push({
        key: "clients",
        label: "Your clients",
        items: clientsRes.data.map((c) => ({
          id: c.id,
          icon: "👤",
          title: c.business_name,
          subtitle: c.contact_name,
          href: `/agency/clients`,
          meta: c.portal_status,
        })),
      });
    }
    return Response.json({ groups });
  }

  // Agency client: own jobs only
  if (role === "agency_client") {
    const { data: client } = await supabase
      .from("clients")
      .select("id, agency_id, portal_slug")
      .eq("portal_user_id", user.id)
      .maybeSingle();
    if (client) {
      const admin = createAdminSupabaseClient();
      const { data: brand } = await admin
        .from("agency_brands")
        .select("portal_slug")
        .eq("agency_id", client.agency_id)
        .maybeSingle();

      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, job_number, status")
        .eq("client_id", client.id)
        .ilike("job_number", like)
        .order("created_at", { ascending: false })
        .limit(6);
      if (jobs?.length && brand?.portal_slug) {
        groups.push({
          key: "jobs",
          label: "Your projects",
          items: jobs.map((j) => ({
            id: j.id,
            icon: "📋",
            title: j.job_number,
            subtitle: j.status.replace(/_/g, " "),
            href: `/portal/${brand.portal_slug}/${client.portal_slug}`,
            meta: "Project",
          })),
        });
      }
    }
    return Response.json({ groups });
  }

  // Direct client: own jobs
  if (role === "direct_client") {
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, job_number, status")
      .eq("direct_client_user_id", user.id)
      .ilike("job_number", like)
      .order("created_at", { ascending: false })
      .limit(6);
    if (jobs?.length) {
      groups.push({
        key: "jobs",
        label: "Your orders",
        items: jobs.map((j) => ({
          id: j.id,
          icon: "📋",
          title: j.job_number,
          subtitle: j.status.replace(/_/g, " "),
          href: `/direct/orders/${j.id}`,
          meta: "Order",
        })),
      });
    }
    return Response.json({ groups });
  }

  // Referral partner: own referrals (by referred user name)
  if (role === "referral_partner") {
    const { data: partner } = await supabase
      .from("referral_partners")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (partner) {
      const { data: referrals } = await supabase
        .from("referrals")
        .select("id, referred_user_id, commission_expires_at, is_active")
        .eq("referral_partner_id", partner.id);
      const admin = createAdminSupabaseClient();
      const ids = (referrals ?? []).map((r) => r.referred_user_id).filter(Boolean);
      if (ids.length) {
        const { data: matched } = await admin
          .from("user_profiles")
          .select("id, first_name, last_name, role, agency_id")
          .in("id", ids)
          .or(`first_name.ilike.${like},last_name.ilike.${like}`)
          .limit(6);
        if (matched?.length) {
          groups.push({
            key: "referrals",
            label: "Your referrals",
            items: matched.map((p) => ({
              id: p.id,
              icon: "🤝",
              title: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
              subtitle: p.role,
              href: `/referral/dashboard`,
              meta: "Referral",
            })),
          });
        }
      }
    }
    return Response.json({ groups });
  }

  return Response.json({ groups });
}
