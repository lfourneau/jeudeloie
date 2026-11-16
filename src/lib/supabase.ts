import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url ?? "http://localhost", anonKey ?? "missing", {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Identité anonyme stable par navigateur (pas de compte). */
export async function ensureSession(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error || !signed.user) throw error ?? new Error("Connexion anonyme impossible");
  return signed.user.id;
}
