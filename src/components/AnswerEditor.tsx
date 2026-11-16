import { type Media, MAX_EMOJIS, splitGraphemes, validateAnswer, WORD_MAX_LENGTH } from "@rules";
import { useState } from "react";
import { actions } from "../lib/actions";
import { DrawingEditor } from "./DrawingEditor";
import { GifPicker, MusicPicker } from "./MediaPicker";
import { PhotoEditor } from "./PhotoEditor";
import { Icon } from "./Icon";
import { Button, ErrorText, MEDIA_LABEL } from "./ui";

const EMOJI_GROUPS: { name: string; list: string }[] = [
  { name: "Humeurs", list: "😀😂🥰😍😘😎🤩🥳😴🤔😅😭😡🥺😱🤯🙈🤪😇🤤" },
  { name: "Cœurs", list: "❤️🧡💛💚💙💜🖤🤍💔💕💖💋💍👫👩‍❤️‍👨🫶" },
  { name: "Activités", list: "🏖️⛰️🏕️✈️🚗🚲🏃🧘🎮🎬🎵🎤📚🛍️🛌🎉💃🏋️⚽🎨" },
  { name: "Manger", list: "🍕🍔🍟🌮🍣🍜🥐🍫🍦🍰🍓🥑🧀🍷🍺☕🍹🥂🍿🥗" },
  { name: "Nature", list: "☀️🌙⭐🌈🌧️❄️🔥🌊🌸🌻🌳🐶🐱🐰🦊🐼🦄🐢🐝🦋" },
  { name: "Objets", list: "🏠🏙️🏰💼💻📱📷🎁💰⏰🗝️🚀🛁🪴🧸🎈🪩🎓👶🌍" },
];

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
      editor = <PhotoEditor busy={busy} onDone={(jpeg) => run(() => actions.uploadAnswerImage(roomId, jpeg))} />;
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
  return (
    <div className="flex flex-col gap-3">
      <div className="champ flex min-h-20 items-center justify-center gap-2 px-4 py-3">
        {picked.length === 0 && <span className="text-muted italic">Choisis jusqu'à {MAX_EMOJIS} emojis</span>}
        {picked.map((e, i) => (
          <button key={i} onClick={() => onChange(picked.filter((_, j) => j !== i).join(""))} className="text-5xl">
            {e}
          </button>
        ))}
        {picked.length > 0 && (
          <button
            onClick={() => onChange(picked.slice(0, -1).join(""))}
            className="ml-2 flex min-h-11 min-w-11 items-center justify-center text-muted"
            aria-label="Effacer le dernier emoji"
          >
            <Icon name="annuler" size={22} />
          </button>
        )}
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.name}
            onClick={() => setGroup(i)}
            className={`pilule min-h-9 shrink-0 border px-3 py-1 font-display text-[15px] font-bold ${i === group ? "border-encre bg-encre text-lettre" : "border-encre/30 bg-lettre text-encre"}`}
          >
            {g.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {splitGraphemes(EMOJI_GROUPS[group].list).map((e) => (
          <button
            key={e}
            disabled={picked.length >= MAX_EMOJIS}
            onClick={() => onChange(value + e)}
            className="aspect-square rounded-lg text-2xl transition hover:bg-papier active:scale-90 disabled:opacity-40"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
