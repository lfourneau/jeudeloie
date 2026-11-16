import { PAWNS } from "@rules";
import { motion } from "framer-motion";
import { useState } from "react";
import { BoardPanel, GameLayout } from "../components/Layout";
import { Legend } from "../components/Legend";
import { SpiralBoard } from "../components/SpiralBoard";
import { Button, Card, ErrorText } from "../components/ui";
import { actions } from "../lib/actions";
import type { GameData } from "../lib/useGame";

export function Lobby({ data, onlineSeats, onLeave }: { data: GameData; onlineSeats: number[]; onLeave: () => void }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = `${window.location.origin}/?code=${data.room.code}`;
  const full = data.players.length === 2;
  const pawn = data.game.pawn;

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

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  const start = async () => {
    setBusy(true);
    await run(() => actions.startGame(data.room.id));
    setBusy(false);
  };

  return (
    <GameLayout board={<BoardPanel position={0} pawn={pawn} />}>
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

      <Card>
        <p className="mb-1 font-display text-lg font-semibold">Votre pion</p>
        <p className="mb-3 text-sm text-muted">Un seul pion pour vous deux : l'un ou l'autre peut le choisir.</p>
        <div className="grid grid-cols-6 gap-2">
          {PAWNS.map((p) => (
            <motion.button
              key={p}
              whileTap={{ scale: 0.85 }}
              onClick={() => p !== pawn && run(() => actions.setPawn(data.room.id, p))}
              aria-pressed={p === pawn}
              className={`flex aspect-square items-center justify-center rounded-2xl text-3xl transition ${
                p === pawn ? "scale-110 bg-gold shadow-lg shadow-gold/30" : "bg-plum-light hover:bg-plum-light/70"
              }`}
            >
              {p}
            </motion.button>
          ))}
        </div>
      </Card>

      <ErrorText>{error}</ErrorText>
      <Button onClick={start} disabled={!full} busy={busy}>
        {full ? "Commencer" : "En attente du 2e joueur"}
      </Button>

      {/* Sur téléphone : règles, plateau et légende sous les commandes */}
      <Card className="lg:hidden">
        <p className="mb-3 text-sm text-muted">
          Atteignez la case 40 en 15 tours. À chaque tour, l'un répond à une question secrète, l'autre devine la question.
        </p>
        <SpiralBoard position={0} pawn={pawn} />
      </Card>
      <Card className="lg:hidden">
        <p className="mb-3 font-display text-lg font-semibold">Légende</p>
        <Legend />
      </Card>
      <p className="hidden text-center text-sm text-muted lg:block">
        Atteignez la case 40 en 15 tours. À chaque tour, l'un répond à une question secrète, l'autre devine la question.
      </p>
      <Button variant="ghost" onClick={onLeave}>
        Quitter la salle
      </Button>
    </GameLayout>
  );
}
