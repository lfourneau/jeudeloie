// Réponses HTTP, CORS et gestion d'erreurs communes à toutes les Edge Functions.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Quelqu'un a écrit entre la lecture et l'écriture : l'action peut être rejouée sur l'état à jour. */
export class ConflictError extends HttpError {
  constructor() {
    super(409, "L'état de la partie a changé, réessaie.");
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Erreurs levées par les fonctions SQL -> statut HTTP + message lisible. */
const SQL_ERRORS: Record<string, [number, string]> = {
  room_not_found: [404, "Aucune partie avec ce code."],
  room_full: [409, "Cette partie a déjà deux joueurs."],
  room_not_lobby: [409, "Cette partie a déjà commencé."],
  round_not_found: [404, "Tour introuvable."],
};

export function fromSqlError(err: { message?: string } | null): HttpError {
  const key = err?.message ?? "";
  if (key === "conflict") return new ConflictError();
  const mapped = SQL_ERRORS[key];
  if (mapped) return new HttpError(mapped[0], mapped[1]);
  console.error("Erreur SQL", err);
  return new HttpError(500, "Erreur serveur.");
}

/** Enveloppe un handler : CORS, POST JSON, erreurs -> JSON { error }. */
export function handle(fn: (req: Request, body: Record<string, unknown>) => Promise<unknown>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);
    try {
      let body: Record<string, unknown> = {};
      const text = await req.text();
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object") body = parsed;
      }
      // Deux clics simultanés (ex. « Continuer » des deux côtés) : l'un perd le verrou de version.
      // On rejoue alors l'action sur l'état à jour, ce qui la rend correcte au lieu de l'échouer.
      for (let attempt = 1; ; attempt++) {
        try {
          const result = await fn(req, body);
          return json(result ?? { ok: true });
        } catch (e) {
          if (!(e instanceof ConflictError) || attempt >= 3) throw e;
          await new Promise((r) => setTimeout(r, 40 + Math.random() * 120));
        }
      }
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      if (e instanceof SyntaxError) return json({ error: "Requête invalide." }, 400);
      console.error(e);
      return json({ error: "Erreur serveur." }, 500);
    }
  };
}

export function requireString(body: Record<string, unknown>, key: string): string {
  const v = body[key];
  if (typeof v !== "string" || !v.trim()) throw new HttpError(400, `Champ « ${key} » manquant.`);
  return v.trim();
}
