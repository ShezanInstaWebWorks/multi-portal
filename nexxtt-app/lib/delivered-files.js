import { createAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * Given a list of `delivered_files` rows, mint a 24 h signed URL for each and
 * return them with a `url` field attached. Uses service_role internally so
 * the caller doesn't need to worry about bucket grants — page-level
 * authorisation has already happened by the time we get here.
 */
export async function signDeliveredFiles(files) {
  if (!files || files.length === 0) return [];
  const admin = createAdminSupabaseClient();
  return Promise.all(
    files.map(async (f) => {
      if (!f.storage_path) return { ...f, url: null };
      const { data } = await admin.storage
        .from("delivered-files")
        .createSignedUrl(f.storage_path, 86400);
      return { ...f, url: data?.signedUrl ?? null };
    })
  );
}
