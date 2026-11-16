import { normalizeRoomCode } from "@rules";
import { motion } from "framer-motion";
import { useState } from "react";
import { Icon } from "../components/Icon";
import { SoundMenu } from "../components/SoundMenu";
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
    if (!n) return setError("Écris ton prénom.");
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
      <div className="flex items-start justify-between">
        <SoundMenu align="left" />
        <div className="timbre flex h-14 w-12 rotate-[6deg] items-center justify-center" aria-hidden>
          <Icon name="coeur" size={26} />
        </div>
      </div>
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative -mt-2 pb-2 text-center">
        <h1 className="titre text-[38px] leading-tight sm:text-[52px]">Devine la question</h1>
        <p className="mt-3 text-lg text-muted italic">Un carnet de jeu qu'on s'envoie à deux, pour se sentir proches malgré la distance.</p>
      </motion.header>

      <Card tilt={-0.4} className="flex flex-col gap-3">
        <label className="font-display text-lg font-bold" htmlFor="name">
          Ton prénom
        </label>
        <input
          id="name"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          placeholder="Camille"
          className="champ px-4 py-3 text-lg"
        />
        <Button onClick={() => run("create")} busy={busy === "create"} disabled={busy !== null}>
          Ouvrir un carnet
        </Button>
      </Card>

      <Card tilt={0.5} className="flex flex-col gap-3">
        <label className="font-display text-lg font-bold" htmlFor="code">
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
            className="champ min-w-0 flex-1 px-4 py-2 text-center font-display text-3xl font-bold tracking-[0.35em] uppercase"
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
