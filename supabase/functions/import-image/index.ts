// Case photo : le répondant colle le lien d'une image. Le serveur la télécharge et la range dans le
// bucket privé, à un chemin à part (<room>/<round>-lien) : elle sera effacée à la fin du tour.
// Protections : https seulement, pas de machine interne (validateImageUrl, revalidé à chaque
// redirection), 8 s max, 5 Mo max, type vérifié par l'en-tête et par les premiers octets.
import { adminClient } from "../_shared/auth.ts";
import { isAnswerer, loadContext, requirePhase, requireRound } from "../_shared/game.ts";
import { handle, HttpError } from "../_shared/http.ts";
import { isImportedImageType, linkedImagePath, MAX_IMPORT_BYTES, sniffImageType, validateImageUrl } from "../_shared/rules.ts";

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;

async function download(start: string): Promise<{ bytes: Uint8Array; type: string }> {
  const deadline = AbortSignal.timeout(TIMEOUT_MS);
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: deadline,
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.9,*/*;q=0.1" },
    }).catch(() => {
      throw new HttpError(400, "Impossible de joindre ce lien.");
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      await res.body?.cancel();
      if (!next) break;
      const v = validateImageUrl(new URL(next, url).toString());
      if (!v.ok) throw new HttpError(400, "Ce lien redirige vers une adresse refusée.");
      url = v.value;
      continue;
    }
    if (!res.ok || !res.body) throw new HttpError(400, "Ce lien ne renvoie pas d'image.");
    if (!isImportedImageType(res.headers.get("content-type"))) {
      await res.body.cancel();
      throw new HttpError(400, "Ce lien ne mène pas directement à une image (JPEG, PNG, WebP ou GIF).");
    }
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_IMPORT_BYTES) {
      await res.body.cancel();
      throw new HttpError(400, "Image trop lourde (5 Mo maximum).");
    }
    // Lecture morceau par morceau, coupée net au-delà de 5 Mo.
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_IMPORT_BYTES) {
        await reader.cancel();
        throw new HttpError(400, "Image trop lourde (5 Mo maximum).");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) {
      bytes.set(c, at);
      at += c.length;
    }
    const type = sniffImageType(bytes);
    if (!type) throw new HttpError(400, "Ce fichier n'est pas une image lisible.");
    return { bytes, type };
  }
  throw new HttpError(400, "Trop de redirections pour ce lien.");
}

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "answering");
  if (!isAnswerer(ctx)) throw new HttpError(409, "C'est à ton partenaire de répondre.");
  const round = requireRound(ctx);
  if (round.media !== "photo") throw new HttpError(409, "Ce tour ne demande pas de photo.");
  const v = validateImageUrl(body.url);
  if (!v.ok) throw new HttpError(400, v.error);

  let image: { bytes: Uint8Array; type: string };
  try {
    image = await download(v.value);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, "Le téléchargement de l'image a échoué.");
  }
  const path = linkedImagePath(ctx.roomId, round.id);
  const { error } = await adminClient().storage.from("answers").upload(path, image.bytes, { contentType: image.type, upsert: true });
  if (error) throw new HttpError(500, "Impossible d'enregistrer l'image.");
  return { path };
}));
