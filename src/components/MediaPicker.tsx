import { useEffect, useRef, useState } from "react";
import { actions } from "../lib/actions";
import type { GifMedia, MusicMedia } from "../lib/types";
import { Button, Dots, ErrorText } from "./ui";

/** Recherche avec délai : ne lance la requête qu'une fois la saisie terminée. */
function useSearch<T>(roomId: string, q: string) {
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await actions.searchMedia(roomId, q);
        if (!cancelled) setResults(res.results as T[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [roomId, q]);
  return { results, loading, error };
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl bg-night/70 px-4 py-3 text-lg outline-none ring-2 ring-white/10 focus:ring-rose"
    />
  );
}

/** Choix d'un morceau sur Deezer, avec écoute de l'extrait. */
export function MusicPicker({ roomId, onDone, busy }: { roomId: string; onDone: (id: string) => void; busy: boolean }) {
  const [q, setQ] = useState("");
  const { results, loading, error } = useSearch<MusicMedia>(roomId, q);
  const [selected, setSelected] = useState<MusicMedia | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audio.current?.pause(), []);

  const toggle = (m: MusicMedia) => {
    if (playing === m.id) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    audio.current = new Audio(m.preview);
    audio.current.onended = () => setPlaying(null);
    audio.current.play().catch(() => setPlaying(null));
    setPlaying(m.id);
  };

  return (
    <div className="flex flex-col gap-3">
      <SearchBox value={q} onChange={setQ} placeholder="Titre, artiste…" />
      {loading && (
        <p className="text-center text-muted">
          <Dots />
        </p>
      )}
      <ErrorText>{error}</ErrorText>
      <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {results.map((m) => (
          <li
            key={m.id}
            className={`flex items-center gap-3 rounded-2xl p-2 ${selected?.id === m.id ? "bg-rose/30 ring-2 ring-rose" : "bg-night/50"}`}
          >
            <button onClick={() => toggle(m)} className="relative shrink-0" aria-label="Écouter l'extrait">
              <img src={m.cover} alt="" className="h-12 w-12 rounded-lg" />
              <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 text-xl">
                {playing === m.id ? "⏸" : "▶"}
              </span>
            </button>
            <button onClick={() => setSelected(m)} className="min-w-0 flex-1 text-left">
              <p className="truncate font-semibold">{m.title}</p>
              <p className="truncate text-sm text-muted">{m.artist}</p>
            </button>
          </li>
        ))}
      </ul>
      <Button onClick={() => selected && onDone(selected.id)} disabled={!selected} busy={busy}>
        {selected ? `Envoyer « ${selected.title} »` : "Choisis un morceau"}
      </Button>
    </div>
  );
}

/** Choix d'un GIF sur GIPHY. */
export function GifPicker({ roomId, onDone, busy }: { roomId: string; onDone: (id: string) => void; busy: boolean }) {
  const [q, setQ] = useState("");
  const { results, loading, error } = useSearch<GifMedia>(roomId, q);
  const [selected, setSelected] = useState<GifMedia | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <SearchBox value={q} onChange={setQ} placeholder="Chercher un GIF…" />
      {loading && (
        <p className="text-center text-muted">
          <Dots />
        </p>
      )}
      <ErrorText>{error}</ErrorText>
      <div className="grid max-h-96 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
        {results.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelected(g)}
            className={`overflow-hidden rounded-xl ${selected?.id === g.id ? "ring-4 ring-rose" : ""}`}
          >
            <img src={g.url} alt={g.title} loading="lazy" className="h-28 w-full object-cover" />
          </button>
        ))}
      </div>
      <p className="text-right text-[10px] text-muted">GIF fournis par GIPHY</p>
      <Button onClick={() => selected && onDone(selected.id)} disabled={!selected} busy={busy}>
        Envoyer ce GIF
      </Button>
    </div>
  );
}
