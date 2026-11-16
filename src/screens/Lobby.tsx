import { FINISH, MAX_TURNS, PAWNS } from "@rules";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { CategoryPicker } from "../components/Categories";
import { GameMenu } from "../components/GameMenu";
import { SoundMenu } from "../components/SoundMenu";
import { BoardPanel, GameLayout } from "../components/Layout";
import { Icon } from "../components/Icon";
import { StampIn } from "../components/Juice";
import { Pawn, pawnLabel } from "../components/Pawn";
import { SquareBoard } from "../components/SquareBoard";
import { Button, Card, ErrorText } from "../components/ui";
import { actions } from "../lib/actions";
import { buzz, sfx } from "../lib/juice";
import type { GameData } from "../lib/useGame";

export function Lobby({
  data,
  onlineSeats,
  onQuit,
  mySeat,
}: {
  data: GameData;
  onlineSeats: number[];
  onQuit: () => Promise<void>;
  mySeat: 0 | 1;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = `${window.location.origin}/?code=${data.room.code}`;
  const full = data.players.length === 2;
  const pawn = data.game.pawn;

  // Le partenaire vient d'arriver : coup de tampon « 2/2 » et petit carillon.
  const wasFull = useRef(full);
  const [arrived, setArrived] = useState(0);
  useEffect(() => {
    if (full && !wasFull.current) {
      setArrived((a) => a + 1);
      sfx.chime();
      buzz([20, 40, 20]);
    }
    wasFull.current = full;
  }, [full]);

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

  const name = (seat: number) => data.players.find((p) => p.seat === seat)?.name;
  const rule = `Atteignez la case ${FINISH} en ${MAX_TURNS} tours. À chaque tour, l'un répond à une question secrète, l'autre devine la question. Trois jokers communs vous aideront en route.`;

  return (
    <GameLayout
      showBoard
      board={<BoardPanel position={0} pawn={pawn} startName={name(0)} endName={name(1)} />}
    >
      <div className="flex justify-end gap-1.5">
        <SoundMenu />
        <GameMenu onQuit={onQuit} />
      </div>
      <Card tilt={-0.5} className="relative text-center">
        <div className="cachet absolute -top-3 -right-2 flex h-16 w-16 rotate-[-10deg] items-center justify-center font-display text-[13px] leading-tight font-bold">
          Poste
          <br />
          {data.room.code}
        </div>
        <p className="font-display text-lg text-muted">Code du carnet</p>
        <p className="my-1 font-display text-6xl font-bold tracking-[0.2em] text-cachet">{data.room.code}</p>
        <Button variant="secondary" onClick={copy}>
          <Icon name="enveloppe" size={20} /> {copied ? "Lien copié" : "Envoyer le lien"}
        </Button>
      </Card>

      <Card tilt={0.4}>
        <div className="mb-3 flex items-center justify-between">
          <span className="titre text-[28px]">Les correspondants</span>
          {arrived > 0 ? (
            <StampIn key={arrived} rotate={-6} sound={false}>
              <span className="cachet flex h-12 w-12 items-center justify-center font-display text-lg font-bold">2/2</span>
            </StampIn>
          ) : (
            <span className="font-display text-lg font-bold text-cachet">{data.players.length}/2</span>
          )}
        </div>
        <ul className="flex flex-col gap-2">
          {[0, 1].map((seat) => {
            const p = data.players.find((x) => x.seat === seat);
            return (
              <li key={seat} className="flex items-center gap-3 border-b border-dashed border-encre/25 py-2 last:border-0">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${p && onlineSeats.includes(seat) ? "bg-sauge ring-1 ring-encre/50" : "bg-encre/20"}`}
                />
                <span className={p ? "font-display text-xl font-bold" : "text-muted italic"}>
                  {p ? p.name : "En attente de ton partenaire…"}
                </span>
                {p && <span className="ml-auto text-[13px] text-muted italic">{seat === 0 ? "point de départ" : "point d'arrivée"}</span>}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card tilt={-0.3}>
        <p className="titre mb-1 text-[28px]">Votre pion</p>
        <p className="mb-3 text-muted italic">
          Un seul pion pour vous deux, choisi par l'un ou l'autre. Pour l'instant : {pawnLabel(pawn).toLowerCase()}.
        </p>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {PAWNS.map((p, i) => (
            <motion.button
              key={p}
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                if (p === pawn) return;
                sfx.step();
                run(() => actions.setPawn(data.room.id, p));
              }}
              aria-pressed={p === pawn}
              aria-label={pawnLabel(p)}
              title={pawnLabel(p)}
              className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-full p-1 transition ${
                p === pawn ? "bg-ocre/60 ring-2 ring-cachet" : "hover:bg-papier"
              }`}
              style={{ rotate: ((i * 37) % 7) - 3 }}
            >
              <motion.span
                key={p === pawn ? `${p}-on` : p}
                className="inline-flex"
                animate={p === pawn ? { y: [0, -12, 0, -4, 0], rotate: [0, -8, 6, 0] } : undefined}
                transition={{ duration: 0.55 }}
              >
                <Pawn id={p} size={46} />
              </motion.span>
            </motion.button>
          ))}
        </div>
      </Card>

      <Card tilt={0.3}>
        <p className="titre mb-1 text-[28px]">Les questions</p>
        <CategoryPicker
          roomId={data.room.id}
          active={data.game.categories ?? []}
          isHost={mySeat === 0}
          hostName={name(0)}
        />
      </Card>

      <ErrorText>{error}</ErrorText>
      <Button onClick={start} disabled={!full} busy={busy}>
        {full ? "Commencer le voyage" : "En attente du 2e joueur"}
      </Button>

      {/* Sur téléphone : règles et plateau sous les commandes */}
      <Card className="lg:hidden">
        <p className="mb-3 text-muted italic">{rule}</p>
        <SquareBoard position={0} pawn={pawn} startName={name(0)} endName={name(1)} />
      </Card>
      <p className="hidden text-center text-muted italic lg:block">{rule}</p>
    </GameLayout>
  );
}
