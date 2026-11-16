// Crée la salle, son code, le joueur siège 0 et le game_state.
import { adminClient, requireUser } from "../_shared/auth.ts";
import { fromSqlError, handle, HttpError, requireString } from "../_shared/http.ts";
import { generateRoomCode } from "../_shared/rules.ts";

Deno.serve(handle(async (req, body) => {
  const userId = await requireUser(req);
  const name = requireString(body, "name").slice(0, 20);
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await adminClient().rpc("create_room", { p_code: code, p_user_id: userId, p_name: name });
    if (!error) return { room_id: data, code };
    if (error.code !== "23505") throw fromSqlError(error); // 23505 = code déjà pris : on retire
  }
  throw new HttpError(503, "Impossible de générer un code, réessaie.");
}));
