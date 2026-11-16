import { type Media, MAX_EMOJIS, splitGraphemes, validateAnswer, WORD_MAX_LENGTH } from "@rules";
import { useState } from "react";
import { Button, ErrorText, MEDIA_LABEL } from "./ui";

const EMOJI_GROUPS: { name: string; list: string }[] = [
  { name: "Humeurs", list: "😀😂🥰😍😘😎🤩🥳😴🤔😅😭😡🥺😱🤯🙈🤪😇🤤" },
  { name: "Cœurs", list: "❤️🧡💛💚💙💜🖤🤍💔💕💖💋💍👫👩‍❤️‍👨🫶" },
  { name: "Activités", list: "🏖️⛰️🏕️✈️🚗🚲🏃🧘🎮🎬🎵🎤📚🛍️🛌🎉💃🏋️⚽🎨" },
  { name: "Manger", list: "🍕🍔🍟🌮🍣🍜🥐🍫🍦🍰🍓🥑🧀🍷🍺☕🍹🥂🍿🥗" },
  { name: "Nature", list: "☀️🌙⭐🌈🌧️❄️🔥🌊🌸🌻🌳🐶🐱🐰🦊🐼🦄🐢🐝🦋" },
  { name: "Objets", list: "🏠🏙️🏰💼💻📱📷🎁💰⏰🗝️🚀🛁🪴🧸🎈🪩🎓👶🌍" },
];

/** Éditeur du média imposé. Validation identique à celle du serveur (rules.ts). */
export function AnswerEditor({ media, onSubmit }: { media: Media; onSubmit: (value: string) => Promise<void> }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const effective: Media = media === "dessin" || media === "photo" ? "mot" : media;
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
          className="w-full rounded-2xl bg-night/70 px-4 py-4 text-center font-display text-3xl font-semibold text-ink outline-none ring-2 ring-white/10 focus:ring-rose"
        />
      )}
      <p className="text-center text-xs text-muted">{MEDIA_LABEL[effective].hint}</p>
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
      <div className="flex min-h-20 items-center justify-center gap-2 rounded-2xl bg-night/70 px-4 py-3 ring-2 ring-white/10">
        {picked.length === 0 && <span className="text-muted">Choisis jusqu'à {MAX_EMOJIS} emojis</span>}
        {picked.map((e, i) => (
          <button key={i} onClick={() => onChange(picked.filter((_, j) => j !== i).join(""))} className="text-5xl">
            {e}
          </button>
        ))}
        {picked.length > 0 && (
          <button onClick={() => onChange(picked.slice(0, -1).join(""))} className="ml-2 text-xl text-muted" aria-label="Effacer">
            ⌫
          </button>
        )}
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.name}
            onClick={() => setGroup(i)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${i === group ? "bg-rose text-white" : "bg-plum-light text-muted"}`}
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
            className="aspect-square rounded-xl bg-plum-light/60 text-2xl transition active:scale-90 disabled:opacity-40"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
