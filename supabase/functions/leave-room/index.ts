// Un joueur quitte la salle. Celui qui reste devient l'hôte et revient en salle d'attente.
import { adminClient, requirePlayer, requireUser } from "../_shared/auth.ts";
import { clearRoomFiles } from "../_shared/game.ts";
import { fromSqlError, handle, requireString } from "../_shared/http.ts";

Deno.serve(handle(async (req, body) => {
  const userId = await requireUser(req);
  const roomId = requireString(body, "room_id");
  await requirePlayer(roomId, userId);
  await clearRoomFiles(roomId);
  const { data, error } = await adminClient().rpc("leave_room", { p_room_id: roomId, p_user_id: userId });
  if (error) throw fromSqlError(error);
  return { result: data };
}));
