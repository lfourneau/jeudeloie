import { type Media, MAX_EMOJIS, splitGraphemes, validateAnswer, WORD_MAX_LENGTH } from "@rules";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { actions } from "../lib/actions";
import { sfx } from "../lib/juice";
import { DrawingEditor } from "./DrawingEditor";
import { EMOJI_GROUPS, searchEmojis } from "./emojis";
import { GifPicker, MusicPicker } from "./MediaPicker";
import { PhotoEditor } from "./PhotoEditor";
import { Icon } from "./Icon";
import { Button, ErrorText, MEDIA_LABEL } from "./ui";

/** Éditeur du média imposé. Le serveur revalide tout (rules.ts). */
export function AnswerEditor({
  media,
  roomId,
  onSubmit,
}: {
  media: Media;
  roomId: string;
  onSubmit: (value: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (produce: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(await produce());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setBusy(false);
    }
  };

  let editor: React.ReactNode;
  switch (media) {
    case "dessin":
      editor = <DrawingEditor busy={busy} onDone={(png) => run(() => actions.uploadAnswerImage(roomId, png))} />;
      break;
    case "photo":
      editor = (
        <PhotoEditor
          busy={busy}
          onDone={(jpeg) => run(() => actions.uploadAnswerImage(roomId, jpeg))}
          onLink={(url) => run(() => actions.importImage(roomId, url))}
        />
      );
      break;
    case "musique":
      editor = <MusicPicker roomId={roomId} busy={busy} onDone={(id) => run(async () => id)} />;
      break;
    case "gif":
      editor = <GifPicker roomId={roomId} busy={busy} onDone={(id) => run(async () => id)} />;
      break;
    default:
      return <TextEditor media={media} onSubmit={onSubmit} />;
  }
  return (
    <div className="flex flex-col gap-3">
      {editor}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

/** Mot, nombre, emojis. Validation identique à celle du serveur. */
function TextEditor({ media, onSubmit }: { media: "mot" | "nombre" | "emojis"; onSubmit: (value: string) => Promise<void> }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const effective = media;
  const check = validateAnswer(effective, value);

  const submit = async () => {
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(check.value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {effective === "emojis" ? (
        <EmojiPicker value={value} onChange={setValue} />
      ) : (
        <input
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(effective === "mot" ? e.target.value.replace(/\s/g, "") : e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          inputMode={effective === "nombre" ? "decimal" : "text"}
          maxLength={effective === "mot" ? WORD_MAX_LENGTH : 20}
          placeholder={effective === "nombre" ? "42" : "Ton mot"}
          autoComplete="off"
          autoCapitalize="off"
          className="champ w-full px-4 py-3 text-center font-display text-4xl font-bold"
        />
      )}
      <p className="text-center text-[14px] text-muted italic">{MEDIA_LABEL[effective].hint}</p>
      <ErrorText>{error}</ErrorText>
      <Button onClick={submit} busy={busy} disabled={!value.trim()}>
        Envoyer ma réponse
      </Button>
    </div>
  );
}

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const picked = value ? splitGraphemes(value) : [];
  const [group, setGroup] = useState(0);
  const [query, setQuery] = useState("");
  const reduce = useReducedMotion();
  const full = picked.length >= MAX_EMOJIS;
  const results = query.trim() ? searchEmojis(query) : EMOJI_GROUPS[group].list.map(([e]) => e);

  const add = (e: string) => {
    if (full) return;
    sfx.tick();
    onChange(value + e);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="champ flex min-h-20 items-center justify-center gap-2 px-4 py-3">
        {picked.length === 0 && <span className="text-muted italic">Choisis jusqu'à {MAX_EMOJIS} emojis</span>}
        <AnimatePresence initial={false}>
          {picked.map((e, i) => (
            <motion.button
              key={`${i}-${e}`}
              type="button"
              initial={reduce ? false : { scale: 0, y: 30, rotate: -20 }}
              animate={{ scale: 1, y: 0, rotate: [-6, 4, -3][i % 3] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              onClick={() => onChange(picked.filter((_, j) => j !== i).join(""))}
              aria-label={`Retirer ${e}`}
              className="text-5xl"
            >
              {e}
            </motion.button>
          ))}
        </AnimatePresence>
        {picked.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(picked.slice(0, -1).join(""))}
            className="ml-2 flex min-h-11 min-w-11 items-center justify-center text-muted"
            aria-label="Effacer le dernier emoji"
          >
            <Icon name="annuler" size={22} />
          </button>
        )}
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Chercher un emoji : plage, chat, fête…"
        aria-label="Chercher un emoji"
        autoComplete="off"
        className="champ w-full px-4 py-2.5 text-[17px]"
      />

      {!query.trim() && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Familles d'emojis">
          {EMOJI_GROUPS.map((g, i) => (
            <button
              key={g.name}
              type="button"
              role="tab"
              aria-selected={i === group}
              onClick={() => setGroup(i)}
              className={`pilule min-h-11 shrink-0 border-[1.5px] px-3.5 py-1 font-display text-[15px] font-bold whitespace-nowrap ${
                i === group ? "border-encre bg-encre text-lettre" : "border-encre/30 bg-lettre text-encre"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      <div className="h-64 overflow-y-auto rounded-[14px_18px_12px_16px] border-[1.5px] border-encre/25 bg-lettre/60 p-1.5">
        {results.length === 0 ? (
          <p className="p-4 text-center text-muted italic">Aucun emoji pour « {query} ». Essaie un autre mot.</p>
        ) : (
          <div className="grid grid-cols-7 gap-1 sm:grid-cols-8">
            {results.map((e) => (
              <button
                key={e}
                type="button"
                disabled={full}
                onClick={() => add(e)}
                aria-label={`Ajouter ${e}`}
                className="flex aspect-square items-center justify-center rounded-lg text-[26px] transition hover:-translate-y-0.5 hover:bg-papier active:scale-90 disabled:opacity-40"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
      {full && <p className="-mt-1 text-center text-[14px] text-muted italic">C'est le maximum : touche un emoji au-dessus pour le retirer.</p>}
    </div>
  );
}
