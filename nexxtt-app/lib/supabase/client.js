"use client";

import { createBrowserClient } from "@supabase/ssr";

// Module-scoped singleton — every component that calls `createClient()` gets
// the same instance for the tab's lifetime.
let browserClient = null;

// No-op lock. Default Supabase uses `navigator.locks` to coordinate token
// refresh across tabs sharing the same origin. That's overkill here and the
// shared lock surfaces as a "Lock was released because another request stole
// it" runtime error in Next dev whenever multiple tabs (or React Strict Mode
// double-renders) call getUser concurrently. Each tab managing its own
// session is fine for this app.
async function noOpLock(_name, _acquireTimeout, fn) {
  return await fn();
}

export function createClient() {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { lock: noOpLock } }
  );
  return browserClient;
}
