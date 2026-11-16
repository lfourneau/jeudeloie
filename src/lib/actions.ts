// Toutes les écritures passent par les Edge Functions : le client n'écrit jamais en base.
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { GifMedia, MusicMedia } from "./types";

export const REFRESH_EVENT = "dlq:refresh";

export class ActionError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

async function call<T = unknown>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      let message = "Une erreur est survenue.";
      try {
        const payload = await res.json();
        if (payload?.error) message = payload.error;
      } catch {
        /* corps non JSON */
      }
      throw new ActionError(message, res.status);
    }
    throw new ActionError("Connexion au serveur impossible. Vérifie ton réseau.");
  }
  // Rafraîchit l'état tout de suite chez celui qui agit, sans attendre l'événement Realtime.
  window.dispatchEvent(new Event(REFRESH_EVENT));
  return data as T;
}

export const actions = {
  createRoom: (name: string) => call<{ room_id: string; code: string }>("create-room", { name }),
  joinRoom: (code: string, name: string) => call<{ room_id: string; code: string }>("join-room", { code, name }),
  startGame: (room_id: string) => call("start-game", { room_id }),
  submitAnswer: (room_id: string, answer: string) => call("submit-answer", { room_id, answer }),
  submitGuess: (room_id: string, guess?: string) => call<{ judged: boolean }>("submit-guess", { room_id, guess }),
  react: (room_id: string) => call("react", { room_id }),
  appeal: (room_id: string) => call("appeal", { room_id }),
  submitAppealScore: (room_id: string, score: number) => call("submit-appeal-score", { room_id, score }),
  continueTurn: (room_id: string) => call("continue", { room_id }),
  rematch: (room_id: string) => call("rematch", { room_id }),
  setPawn: (room_id: string, pawn: string) => call("set-pawn", { room_id, pawn }),
  searchMedia: (room_id: string, q: string) =>
    call<{ results: (MusicMedia | GifMedia)[] }>("search-media", { room_id, q }),
  /** Envoie une image (dessin, photo) au chemin imposé par le serveur et renvoie ce chemin. */
  uploadAnswerImage: async (room_id: string, blob: Blob): Promise<string> => {
    const { path, token } = await call<{ path: string; token: string }>("upload-url", { room_id });
    const { error } = await supabase.storage
      .from("answers")
      .uploadToSignedUrl(path, token, blob, { contentType: blob.type, upsert: true });
    if (error) throw new ActionError("L'envoi de l'image a échoué, réessaie.");
    return path;
  },
};
