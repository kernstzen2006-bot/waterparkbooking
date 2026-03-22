import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export async function uploadBytes(
  path: string,
  bytes: Uint8Array,
  contentType: string
): Promise<{ key: string; publicUrl: string }> {
  const bucket = env.SUPABASE_STORAGE_BUCKET;

  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    upsert: true
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { key: path, publicUrl: data.publicUrl };
}

export async function downloadBytes(path: string): Promise<Uint8Array> {
  const bucket = env.SUPABASE_STORAGE_BUCKET;

  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message ?? "no data"}`);

  // data is a Blob in Node runtime too
  const ab = await data.arrayBuffer();
  return new Uint8Array(ab);
}
