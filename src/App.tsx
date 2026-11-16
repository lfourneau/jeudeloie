import { normalizeRoomCode } from "@rules";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MiniBoard } from "./components/Board";
import { BoardPanel, BoardSheet, GameLayout } from "./components/Layout";
import { Card, Dots, Screen } from "./components/ui";
import { ensureSession, supabaseConfigured } from "./lib/supabase";
import { setCurrentUserId, useGame } from "./lib/useGame";
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
          <p className="font-bold">Configuration manquante</p>
          <p className="mt-2 text-sm text-muted">
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
    <div className="flex min-h-dvh items-center justify-center text-muted">
      <Dots />
    </div>
  );
}

function animatedKey(roomId: string) {
  return `dlq:anim:${roomId}`;
}

function Game({ roomId, userId, onLeave }: { roomId: string; userId: string; onLeave: () => void }) {
  const { data, notMember, onlineSeats } = useGame(roomId);
  const [animated, setAnimated] = useState<string | null>(() => storage(animatedKey(roomId)));
  const [animPos, setAnimPos] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (notMember) onLeave();
  }, [notMember, onLeave]);

  // Dernier tour dont la roue a été tirée : on l'anime une fois par appareil.
  const lastSpun = useMemo(
    () => (data ? [...data.rounds].reverse().find((r) => r.wheel_result !== null) : undefined),
    [data],
  );
  const markAnimated = useCallback(() => {
    if (!lastSpun) return;
    storage(animatedKey(roomId), lastSpun.id);
    setAnimated(lastSpun.id);
    setAnimPos(null);
  }, [lastSpun, roomId]);

  if (!data) return <Loading />;

  const me = data.players.find((p) => p.user_id === userId);
  const partner = data.players.find((p) => p.user_id !== userId);
  if (!me) return <Loading />;

  if (data.game.phase === "lobby") return <Lobby data={data} onlineSeats={onlineSeats} onLeave={onLeave} />;
  if (!partner) return <Loading />;

  const pendingWheel = lastSpun && lastSpun.id !== animated ? lastSpun : null;
  if (!pendingWheel && data.game.phase === "finished") return <End data={data} onLeave={onLeave} />;

  const pawn = data.game.pawn;
  const round = data.rounds.find((r) => r.id === data.game.current_round_id);
  const turn = pendingWheel ? pendingWheel.turn_number : data.game.turns_counted + 1;
  const position = pendingWheel ? (animPos ?? pendingWheel.case_index) : data.game.position;

  let content: React.ReactNode;
  let key: string;
  if (pendingWheel) {
    key = `wheel-${pendingWheel.id}`;
    content = <WheelScreen round={pendingWheel} pawn={pawn} onPosition={setAnimPos} onDone={markAnimated} />;
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

  const boardPanel = <BoardPanel position={position} pawn={pawn} turn={turn} />;

  return (
    <GameLayout board={boardPanel}>
      <div className="lg:hidden">
        <MiniBoard
          position={position}
          turn={turn}
          pawn={pawn}
          partnerName={partner.name}
          partnerOnline={onlineSeats.includes(partner.seat)}
          onOpenBoard={() => setSheetOpen(true)}
        />
      </div>
      <div className="hidden items-center justify-end gap-2 text-sm text-muted lg:flex">
        <span className={`h-2 w-2 rounded-full ${onlineSeats.includes(partner.seat) ? "bg-mint" : "bg-white/20"}`} />
        {partner.name} {onlineSeats.includes(partner.seat) ? "est connecté·e" : "est hors ligne"}
      </div>
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
      <BoardSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        {boardPanel}
      </BoardSheet>
    </GameLayout>
  );
}
