// Médias externes : Deezer (musique, sans clé) et GIPHY (GIF, clé GIPHY_API_KEY en secret).
// Les métadonnées sont toujours relues ici à partir de l'id : on ne fait pas confiance au client.
import { HttpError } from "./http.ts";

export interface MusicMedia {
  kind: "musique";
  id: string;
  title: string;
  artist: string;
  cover: string;
  preview: string;
}

export interface GifMedia {
  kind: "gif";
  id: string;
  title: string;
  url: string; // GIF animé
  still: string; // image fixe (pour le juge)
  width: number;
  height: number;
}

const TIMEOUT = 8_000;

// ---------- Deezer ----------

interface DeezerTrack {
  id: number;
  title: string;
  preview: string;
  artist: { name: string };
  album: { cover_medium: string };
}

function toMusic(t: DeezerTrack): MusicMedia {
  return {
    kind: "musique",
    id: String(t.id),
    title: t.title,
    artist: t.artist?.name ?? "",
    cover: t.album?.cover_medium ?? "",
    preview: t.preview ?? "",
  };
}

export async function searchMusic(q: string): Promise<MusicMedia[]> {
  const res = await fetch(`https://api.deezer.com/search?limit=12&q=${encodeURIComponent(q)}`, {
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new HttpError(502, "Recherche musicale indisponible.");
  const data = await res.json();
  return ((data?.data ?? []) as DeezerTrack[]).filter((t) => t.preview).map(toMusic);
}

export async function getMusic(id: string): Promise<MusicMedia> {
  const res = await fetch(`https://api.deezer.com/track/${encodeURIComponent(id)}`, {
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const data = res.ok ? await res.json() : null;
  if (!data || data.error || !data.id) throw new HttpError(400, "Morceau introuvable.");
  return toMusic(data as DeezerTrack);
}

// ---------- GIPHY ----------

export function giphyEnabled(): boolean {
  return Boolean(Deno.env.get("GIPHY_API_KEY"));
}

interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_height: { url: string; width: string; height: string };
    fixed_height_still: { url: string };
  };
}

function toGif(g: GiphyGif): GifMedia {
  const img = g.images.fixed_height;
  return {
    kind: "gif",
    id: g.id,
    title: g.title ?? "",
    url: img.url,
    still: g.images.fixed_height_still?.url ?? img.url,
    width: Number(img.width) || 200,
    height: Number(img.height) || 200,
  };
}

function giphyKey(): string {
  const key = Deno.env.get("GIPHY_API_KEY");
  if (!key) throw new HttpError(503, "Les GIF ne sont pas configurés.");
  return key;
}

export async function searchGifs(q: string): Promise<GifMedia[]> {
  const url = `https://api.giphy.com/v1/gifs/search?api_key=${giphyKey()}&limit=18&rating=pg-13&lang=fr&q=${
    encodeURIComponent(q)
  }`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new HttpError(502, "Recherche de GIF indisponible.");
  const data = await res.json();
  return ((data?.data ?? []) as GiphyGif[]).map(toGif);
}

export async function getGif(id: string): Promise<GifMedia> {
  const res = await fetch(`https://api.giphy.com/v1/gifs/${encodeURIComponent(id)}?api_key=${giphyKey()}`, {
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const data = res.ok ? await res.json() : null;
  if (!data?.data?.id) throw new HttpError(400, "GIF introuvable.");
  return toGif(data.data as GiphyGif);
}
