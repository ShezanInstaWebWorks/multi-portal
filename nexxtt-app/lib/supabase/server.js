import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Next.js 16: `cookies()` is async — callers must `await createServerSupabaseClient()`.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Route handlers with immutable cookies — safe to ignore.
          }
        },
      },
    }
  );
}

// Service-role client. Never expose to the browser. Use only inside Route Handlers
// that have already validated the caller.
export function createAdminSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}
