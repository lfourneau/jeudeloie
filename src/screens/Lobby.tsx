import { useState } from "react";
import { Board } from "../components/Board";
import { Button, Card, ErrorText, Screen } from "../components/ui";
import { actions } from "../lib/actions";
import type { GameData } from "../lib/useGame";

export function Lobby({ data, onlineSeats, onLeave }: { data: GameData; onlineSeats: number[]; onLeave: () => void }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = `${window.location.origin}/?code=${data.room.code}`;
  const full = data.players.length === 2;

  const copy = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Devine la question", text: "Rejoins-moi !", url: link });
      else await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* partage annulé */
    }
  };

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await actions.startGame(data.room.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Card className="text-center">
        <p className="text-sm font-bold text-muted">Code de la partie</p>
        <p className="my-2 font-display text-6xl font-bold tracking-[0.25em]">{data.room.code}</p>
        <Button variant="secondary" onClick={copy}>
          {copied ? "Lien copié ✓" : "Copier le lien"}
        </Button>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-lg font-semibold">Joueurs</span>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${full ? "bg-mint text-night" : "bg-plum-light"}`}>
            {data.players.length}/2
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {[0, 1].map((seat) => {
            const p = data.players.find((x) => x.seat === seat);
            return (
              <li key={seat} className="flex items-center gap-3 rounded-2xl bg-night/50 px-4 py-3">
                <span className={`h-2.5 w-2.5 rounded-full ${p && onlineSeats.includes(seat) ? "bg-mint" : "bg-white/20"}`} />
                <span className={p ? "font-bold" : "text-muted"}>{p ? p.name : "En attente de ton partenaire…"}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <ErrorText>{error}</ErrorText>
      <Button onClick={start} disabled={!full} busy={busy}>
        {full ? "Commencer" : "En attente du 2e joueur"}
      </Button>

      <Card>
        <p className="mb-3 text-sm text-muted">
          Atteignez la case 40 en 15 tours. À chaque tour, l'un répond à une question secrète, l'autre devine la question.
        </p>
        <Board position={0} />
      </Card>
      <Button variant="ghost" onClick={onLeave}>
        Quitter la salle
      </Button>
    </Screen>
  );
}
