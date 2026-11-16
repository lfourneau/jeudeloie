import { normalizeRoomCode } from "@rules";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button, Card, ErrorText, Screen } from "../components/ui";
import { actions } from "../lib/actions";

const NAME_KEY = "dlq:name";

function readName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function Home({ initialCode, onEnter }: { initialCode: string; onEnter: (roomId: string) => void }) {
  const [name, setName] = useState(readName);
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: "create" | "join") => {
    const n = name.trim();
    if (!n) return setError("Choisis un pseudo.");
    if (kind === "join" && normalizeRoomCode(code).length !== 4) return setError("Le code fait 4 lettres.");
    try {
      localStorage.setItem(NAME_KEY, n);
    } catch {
      /* stockage indisponible */
    }
    setBusy(kind);
    setError(null);
    try {
      const res = kind === "create" ? await actions.createRoom(n) : await actions.joinRoom(code, n);
      onEnter(res.room_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setBusy(null);
    }
  };

  return (
    <Screen>
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="pb-2 pt-8 text-center">
        <div className="text-6xl">💞</div>
        <h1 className="mt-3 font-display text-4xl font-bold">Devine la question</h1>
        <p className="mt-2 text-muted">Le jeu à deux pour se sentir proches, même à distance.</p>
      </motion.header>

      <Card className="flex flex-col gap-3">
        <label className="text-sm font-bold text-muted" htmlFor="name">
          Ton pseudo
        </label>
        <input
          id="name"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          placeholder="Lou"
          className="rounded-2xl bg-night/70 px-4 py-3 text-lg outline-none ring-2 ring-white/10 focus:ring-rose"
        />
        <Button onClick={() => run("create")} busy={busy === "create"} disabled={busy !== null}>
          Créer une partie
        </Button>
      </Card>

      <Card className="flex flex-col gap-3">
        <label className="text-sm font-bold text-muted" htmlFor="code">
          Rejoindre avec un code
        </label>
        <div className="flex gap-2">
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && run("join")}
            placeholder="ABCD"
            autoCapitalize="characters"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-2xl bg-night/70 px-4 py-3 text-center font-display text-2xl tracking-[0.4em] uppercase outline-none ring-2 ring-white/10 focus:ring-rose"
          />
          <Button variant="secondary" className="!w-auto" onClick={() => run("join")} busy={busy === "join"} disabled={busy !== null}>
            Rejoindre
          </Button>
        </div>
      </Card>
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
