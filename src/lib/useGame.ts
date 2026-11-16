// État de la partie : tout vient de la base. Au chargement on lit, puis on s'abonne.
// Un rafraîchissement ou une coupure réseau ne perd rien : on relit et on se réabonne.
import { useCallback, useEffect, useRef, useState } from "react";
import { REFRESH_EVENT } from "./actions";
import { supabase } from "./supabase";
import type { GameState, Player, Room, Round, Secret } from "./types";

export interface GameData {
  room: Room;
  players: Player[];
  game: GameState;
  rounds: Round[];
  secrets: Record<string, Secret>;
}

export function useGame(roomId: string) {
  const [data, setData] = useState<GameData | null>(null);
  const [notMember, setNotMember] = useState(false);
  const [onlineSeats, setOnlineSeats] = useState<number[]>([]);
  const timer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    const [room, players, game, rounds] = await Promise.all([
      supabase.from("rooms").select("id, code, status").eq("id", roomId).maybeSingle(),
      supabase.from("players").select("*").eq("room_id", roomId).order("seat"),
      supabase.from("game_state").select("*").eq("room_id", roomId).maybeSingle(),
      supabase.from("rounds").select("*").eq("room_id", roomId).order("turn_number"),
    ]);
    if (room.error || game.error || players.error || rounds.error) return; // réseau : on réessaiera
    if (!room.data || !game.data) {
      setNotMember(true); // la RLS ne renvoie rien : on n'est pas dans cette salle
      return;
    }
    const roundRows = (rounds.data ?? []) as Round[];
    const secrets: Record<string, Secret> = {};
    if (roundRows.length) {
      // La RLS ne renvoie que les secrets autorisés : ceux du répondant et ceux des tours révélés.
      const { data: s } = await supabase
        .from("round_secrets")
        .select("round_id, question_text, theme")
        .in("round_id", roundRows.map((r) => r.id));
      for (const row of (s ?? []) as Secret[]) secrets[row.round_id] = row;
    }
    setData({
      room: room.data as Room,
      players: (players.data ?? []) as Player[],
      game: game.data as GameState,
      rounds: roundRows,
      secrets,
    });
  }, [roomId]);

  const scheduleLoad = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(load, 80);
  }, [load]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`db:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_state", filter: `room_id=eq.${roomId}` }, scheduleLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds", filter: `room_id=eq.${roomId}` }, scheduleLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` }, scheduleLoad)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") scheduleLoad(); // rattrape ce qui a changé pendant la coupure
      });
    const onVisible = () => document.visibilityState === "visible" && scheduleLoad();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", scheduleLoad);
    window.addEventListener(REFRESH_EVENT, scheduleLoad);
    // Filet de sécurité si un événement Realtime se perd
    const poll = window.setInterval(scheduleLoad, 15000);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", scheduleLoad);
      window.removeEventListener(REFRESH_EVENT, scheduleLoad);
      window.clearInterval(poll);
      window.clearTimeout(timer.current);
    };
  }, [roomId, load, scheduleLoad]);

  // Presence : savoir si le partenaire est connecté.
  const code = data?.room.code;
  const mySeat = data ? data.players.find((p) => p.user_id === currentUserId())?.seat : undefined;
  useEffect(() => {
    if (!code || mySeat === undefined) return;
    const ch = supabase.channel(`room:${code}`, { config: { presence: { key: String(mySeat) } } });
    ch.on("presence", { event: "sync" }, () => {
      setOnlineSeats(Object.keys(ch.presenceState()).map(Number));
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") ch.track({ seat: mySeat, at: Date.now() });
    });
    return () => {
      supabase.removeChannel(ch);
    };
  }, [code, mySeat]);

  return { data, notMember, onlineSeats, reload: load };
}

let cachedUserId: string | null = null;
export function setCurrentUserId(id: string) {
  cachedUserId = id;
}
export function currentUserId(): string | null {
  return cachedUserId;
}
