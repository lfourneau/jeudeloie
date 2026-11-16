// Ajoute le joueur siège 1. Refuse une troisième personne.
import { adminClient, requireUser } from "../_shared/auth.ts";
import { fromSqlError, handle, HttpError, requireString } from "../_shared/http.ts";
import { normalizeRoomCode } from "../_shared/rules.ts";

Deno.serve(handle(async (req, body) => {
  const userId = await requireUser(req);
  const name = requireString(body, "name").slice(0, 20);
  const code = normalizeRoomCode(requireString(body, "code"));
  if (code.length !== 4) throw new HttpError(400, "Le code fait 4 lettres.");
  const { data, error } = await adminClient().rpc("join_room", { p_code: code, p_user_id: userId, p_name: name });
  if (error) throw fromSqlError(error);
  return { room_id: data, code };
}));
