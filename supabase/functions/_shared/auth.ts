// Identité : lit le JWT de l'appel et retrouve le joueur dans la salle.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.119.0";
import { HttpError } from "./http.ts";

let admin: SupabaseClient | null = null;

/** Client avec la clé service : contourne la RLS. N'est jamais exposé au navigateur. */
export function adminClient(): SupabaseClient {
  if (!admin) {
    admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

export async function requireUser(req: Request): Promise<string> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Session manquante.");
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Session invalide.");
  return data.user.id;
}

export interface PlayerRow {
  id: string;
  room_id: string;
  user_id: string;
  name: string;
  seat: 0 | 1;
}

export async function requirePlayer(roomId: string, userId: string): Promise<PlayerRow> {
  const { data, error } = await adminClient()
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new HttpError(500, "Erreur serveur.");
  if (!data) throw new HttpError(403, "Tu ne fais pas partie de cette partie.");
  return data as PlayerRow;
}
