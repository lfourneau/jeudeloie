import { normalizeRoomCode } from "@rules";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBar } from "./components/Board";
import { GameMenu } from "./components/GameMenu";
import { BoardPanel, BoardSheet, GameLayout } from "./components/Layout";
import { Card, Dots, Screen } from "./components/ui";
import { actions } from "./lib/actions";
import { ensureSession, supabaseConfigured } from "./lib/supabase";
import { type GameData, setCurrentUserId, useGame } from "./lib/useGame";
import { Answer } from "./screens/Answer";
import { Appeal } from "./screens/Appeal";
import { End } from "./screens/End";
import { Guess } from "./screens/Guess";
import { Home } from "./screens/Home";
import { Judging } from "./screens/Judging";
import { Lobby } from "./screens/Lobby";
import { Reveal } from "./screens/Reveal";
import type { TurnProps } from "./screens/turn";
import { WheelScreen } from "./screens/WheelScreen";

const ROOM_KEY = "dlq:room";

function storage(key: string, value?: string | null): string | null {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible : on continue sans */
  }
  return null;
}

export function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(() => storage(ROOM_KEY));
  const [initialCode, setInitialCode] = useState(() =>
    normalizeRoomCode(new URLSearchParams(location.search).get("code") ?? ""),
  );

  useEffect(() => {
    if (!supabaseConfigured) return;
    ensureSession()
      .then((id) => {
        setCurrentUserId(id);
        setUserId(id);
      })
      .catch(() => setAuthError("Connexion impossible. Vérifie que la connexion anonyme est activée dans Supabase."));
  }, []);

  const enter = (id: string) => {
    storage(ROOM_KEY, id);
    history.replaceState(null, "", "/");
    setInitialCode("");
    setRoomId(id);
  };
  const leave = useCallback(() => {
    storage(ROOM_KEY, null);
    setRoomId(null);
  }, []);

  if (!supabaseConfigured) {
    return (
      <Screen>
        <Card>
          <p className="titre text-[28px]">Configuration manquante</p>
          <p className="mt-2 text-muted">
            Renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local (voir README).
          </p>
        </Card>
      </Screen>
    );
  }
  if (authError) {
    return (
      <Screen>
        <Card>{authError}</Card>
      </Screen>
    );
  }
  if (!userId) return <Loading />;
  // Un lien d'invitation prime sur une ancienne partie mémorisée.
  if (!roomId || initialCode) return <Home initialCode={initialCode} onEnter={enter} />;
  return <Game key={roomId} roomId={roomId} userId={userId} onLeave={leave} />;
}

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-encre">
      <Dots />
    </div>
  );
}

function animatedKey(roomId: string) {
  return `dlq:anim:${roomId}`;
}

function Game({ roomId, userId, onLeave }: { roomId: string; userId: string; onLeave: () => void }) {
  const { data, notMember, onlineSeats } = useGame(roomId);

  useEffect(() => {
    if (notMember) onLeave();
  }, [notMember, onLeave]);

  // Quitter : le serveur retire le joueur (le partenaire revient en salle d'attente), puis on oublie la salle.
  const quit = useCallback(async () => {
    await actions.leaveRoom(roomId);
    onLeave();
  }, [roomId, onLeave]);
  const reset = useCallback(async () => {
    await actions.resetGame(roomId);
  }, [roomId]);

  if (!data) return <Loading />;
  return <GameView data={data} userId={userId} onlineSeats={onlineSeats} onQuit={quit} onReset={reset} />;
}

/**
 * Affichage d'une partie à partir de son état : écran de la phase, barre d'état, plateau.
 * Composant pur (aucun accès réseau) : la page d'aperçu de développement l'utilise avec des données fictives.
 */
export function GameView({
  data,
  userId,
  onlineSeats,
  onQuit,
  onReset,
  initialBoardOpen = false,
}: {
  data: GameData;
  userId: string;
  onlineSeats: number[];
  onQuit: () => Promise<void>;
  onReset: () => Promise<void>;
  initialBoardOpen?: boolean;
}) {
  const roomId = data.room.id;
  const [animated, setAnimated] = useState<string | null>(() => storage(animatedKey(roomId)));
  const [animPos, setAnimPos] = useState<number | null>(null);
  // Plateau masqué pendant la manche pour laisser la place au jeu, affiché à la demande.
  const [boardOpen, setBoardOpen] = useState(initialBoardOpen);
  const quit = onQuit;
  const reset = onReset;

  // Dernier tour dont la roue a été tirée : on l'anime une fois par appareil.
  const lastSpun = useMemo(() => [...data.rounds].reverse().find((r) => r.wheel_result !== null), [data]);
  const markAnimated = useCallback(() => {
    if (!lastSpun) return;
    storage(animatedKey(roomId), lastSpun.id);
    setAnimated(lastSpun.id);
    setAnimPos(null);
  }, [lastSpun, roomId]);

  const me = data.players.find((p) => p.user_id === userId);
  const partner = data.players.find((p) => p.user_id !== userId);
  if (!me) return <Loading />;

  if (data.game.phase === "lobby") return <Lobby data={data} onlineSeats={onlineSeats} onQuit={quit} />;
  if (!partner) return <Loading />;

  const pendingWheel = lastSpun && lastSpun.id !== animated ? lastSpun : null;
  if (!pendingWheel && data.game.phase === "finished") return <End data={data} onQuit={quit} />;

  const pawn = data.game.pawn;
  const seatName = (seat: number) => data.players.find((p) => p.seat === seat)?.name;
  const round = data.rounds.find((r) => r.id === data.game.current_round_id);
  const turn = pendingWheel ? pendingWheel.turn_number : data.game.turns_counted + 1;
  const position = pendingWheel ? (animPos ?? pendingWheel.case_index) : data.game.position;

  let content: React.ReactNode;
  let key: string;
  if (pendingWheel) {
    key = `wheel-${pendingWheel.id}`;
    content = (
      <WheelScreen
        round={pendingWheel}
        pawn={pawn}
        startName={seatName(0)}
        endName={seatName(1)}
        onPosition={setAnimPos}
        onDone={markAnimated}
      />
    );
  } else if (!round) {
    key = "wait";
    content = <Loading />;
  } else {
    const props: TurnProps = {
      data,
      round,
      secret: data.secrets[round.id],
      me,
      partner,
      isAnswerer: me.seat === data.game.answerer_seat,
    };
    key = `${round.id}-${data.game.phase}`;
    switch (data.game.phase) {
      case "answering":
        content = <Answer {...props} />;
        break;
      case "guessing":
        content = <Guess {...props} />;
        break;
      case "reveal":
        content = <Reveal {...props} />;
        break;
      case "appeal":
        content = <Appeal {...props} />;
        break;
      default: // judging, et spin/moving transitoires
        content = <Judging {...props} />;
    }
  }

  const boardPanel = (
    <BoardPanel position={position} pawn={pawn} turn={turn} startName={seatName(0)} endName={seatName(1)} />
  );
  // Entre deux manches (roue + déplacement du pion), le plateau s'affiche toujours.
  const showBoard = boardOpen || !!pendingWheel;

  return (
    <GameLayout board={boardPanel} showBoard={showBoard}>
      <StatusBar
        position={position}
        turn={turn}
        partnerName={partner.name}
        partnerOnline={onlineSeats.includes(partner.seat)}
        boardOpen={boardOpen}
        onToggleBoard={() => setBoardOpen((o) => !o)}
        menu={<GameMenu onQuit={quit} onReset={me.seat === 0 ? reset : undefined} />}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-4"
        >
          {content}
        </motion.div>
      </AnimatePresence>
      {/* Téléphone : pendant la roue, le plateau est déjà dans WheelScreen */}
      <BoardSheet open={boardOpen} onClose={() => setBoardOpen(false)}>
        {boardPanel}
      </BoardSheet>
    </GameLayout>
  );
}
