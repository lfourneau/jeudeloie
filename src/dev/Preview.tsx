// Page d'aperçu, en développement seulement (`npm run dev`, puis `/?apercu=<écran>`).
// Affiche chaque écran du jeu avec des données fictives, sans Supabase : sert à vérifier la mise en page
// (captures automatiques avec Chromium). N'est jamais incluse dans le build de production (voir main.tsx).
import { INITIAL_JOKERS, type Media } from "@rules";
import { GameView } from "../App";
import { Home } from "../screens/Home";
import type { GameState, Player, Round, Secret } from "../lib/types";
import type { GameData } from "../lib/useGame";

const ROOM = `apercu-${Date.now()}`; // nouvel id à chaque chargement : la roue est toujours rejouée
const P0: Player = { id: "p0", room_id: ROOM, user_id: "u0", name: "Camille", seat: 0 };
const P1: Player = { id: "p1", room_id: ROOM, user_id: "u1", name: "Alexandre", seat: 1 };

function round(o: Partial<Round> & { id: string; turn_number: number }): Round {
  return {
    room_id: ROOM,
    case_index: 12,
    media: "mot",
    answerer_seat: 0,
    answer_text: "Lundi",
    answer_media_path: null,
    answer_media: null,
    guess_text: null,
    llm_score: null,
    llm_comment: null,
    judge_failed: false,
    originality_bonus: false,
    heart: false,
    appeal_scores: {},
    appeal_manual: false,
    final_score: null,
    wheel_level: null,
    wheel_index: null,
    wheel_result: null,
    landed_index: null,
    case_effect: null,
    position_after: null,
    revealed: false,
    continue_votes: [],
    joker_keyword: null,
    joker_topic: null,
    joker_choices: null,
    categorie: "mignon",
    niveau: null,
    contexte: null,
    ...o,
  };
}

function state(o: Partial<GameState>): GameState {
  return {
    room_id: ROOM,
    phase: "answering",
    turn_number: 5,
    turns_counted: 4,
    answerer_seat: 0,
    position: 12,
    appeal_used: false,
    inventory: [...INITIAL_JOKERS],
    categories: ["mignon", "drole", "spicy", "profond"],
    current_round_id: "r5",
    outcome: null,
    pawn: "renard",
    version: 1,
    updated_at: new Date().toISOString(),
    ...o,
  };
}

const QUESTION = "Le mot qui résume notre dernier week-end ensemble";

function data(game: GameState, rounds: Round[], players: Player[] = [P0, P1], secretFor: string[] = []): GameData {
  const secrets: Record<string, Secret> = {};
  for (const id of secretFor) secrets[id] = { round_id: id, question_text: QUESTION, theme: "souvenirs" };
  return { room: { id: ROOM, code: "MIEL", status: game.phase === "lobby" ? "lobby" : "playing" }, players, game, rounds, secrets };
}

const answering = (media: Media) => round({ id: "r5", turn_number: 5, media, answer_text: null });
const guessing = (o: Partial<Round> = {}) => round({ id: "r5", turn_number: 5, ...o });
const revealed = (o: Partial<Round>) =>
  round({
    id: "r5",
    turn_number: 5,
    guess_text: "Ce qui t'a le plus marqué ce week-end ?",
    llm_score: 3,
    llm_comment: "Pas loin du tout : vous étiez sur la même longueur d'onde, il manquait juste le petit détail.",
    revealed: true,
    ...o,
  });
const spun = (o: Partial<Round>) =>
  round({
    id: "r4",
    turn_number: 4,
    revealed: true,
    guess_text: "…",
    llm_score: 4,
    final_score: 4,
    wheel_level: 3,
    wheel_index: 2,
    wheel_result: 4,
    case_index: 8,
    landed_index: 12,
    position_after: 12,
    ...o,
  });
const finished = (outcome: "win" | "lose") => {
  const rounds = [1, 2, 3, 4].map((n) =>
    round({
      id: `f${n}`,
      turn_number: n,
      revealed: true,
      answer_text: ["Plage", "42", "Pizza", "Câlin"][n - 1],
      guess_text: "Une devinette assez longue pour voir comment le texte passe à la ligne",
      final_score: [5, 3, 4, 2][n - 1],
      heart: n % 2 === 1,
      wheel_result: 3,
    }),
  );
  return { rounds, game: state({ phase: "finished", outcome, position: outcome === "win" ? 63 : 51, turns_counted: 24 }) };
};

type Screen = { data: GameData; user: "u0" | "u1"; boardOpen?: boolean; markAnimated?: string };

const SCREENS: Record<string, () => Screen> = {
  "lobby-1": () => ({ data: data(state({ phase: "lobby", current_round_id: null, position: 0 }), [], [P0]), user: "u0" }),
  "lobby-2": () => ({ data: data(state({ phase: "lobby", current_round_id: null, position: 0 }), []), user: "u0" }),
  "lobby-sans-spicy": () => ({
    data: data(state({ phase: "lobby", current_round_id: null, position: 0, categories: ["mignon", "drole", "profond"] }), []),
    user: "u1",
  }),
  "answer-spicy": () => ({
    data: data(state({ position: 44 }), [round({ id: "r5", turn_number: 5, media: "emojis", answer_text: null, categorie: "spicy", niveau: 2 })], undefined, ["r5"]),
    user: "u0",
  }),
  "answer-mot": () => ({
    data: data(state({}), [round({ id: "r5", turn_number: 5, media: "mot", answer_text: null, contexte: "un moment" })], undefined, ["r5"]),
    user: "u0",
  }),
  "answer-photo": () => ({ data: data(state({}), [answering("photo")], undefined, ["r5"]), user: "u0" }),
  "answer-emojis": () => ({ data: data(state({}), [answering("emojis")], undefined, ["r5"]), user: "u0" }),
  "answer-dessin": () => ({ data: data(state({}), [answering("dessin")], undefined, ["r5"]), user: "u0" }),
  "answer-attente": () => ({ data: data(state({}), [answering("mot")]), user: "u1" }),
  "guess": () => ({ data: data(state({ phase: "guessing" }), [guessing({ contexte: "un moment" })]), user: "u1" }),
  "guess-nombre": () => ({
    data: data(state({ phase: "guessing" }), [guessing({ media: "nombre", answer_text: "7", contexte: "une note sur 10" })]),
    user: "u1",
  }),
  "reveal-lien-efface": () => ({
    data: data(state({ phase: "reveal" }), [revealed({ media: "photo", answer_text: null, answer_media: { kind: "lien", efface: true } })], undefined, ["r5"]),
    user: "u1",
  }),
  "guess-indices": () => ({
    data: data(state({ phase: "guessing", inventory: ["choix"] }), [guessing({ joker_keyword: "week-end", joker_topic: "Nos retrouvailles" })]),
    user: "u1",
  }),
  "guess-choix": () => ({
    data: data(state({ phase: "guessing", inventory: [] }), [
      guessing({
        joker_keyword: "week-end",
        joker_topic: "Nos retrouvailles",
        joker_choices: [QUESTION, "Ton péché mignon", "La pire tâche ménagère selon toi"],
      }),
    ]),
    user: "u1",
  }),
  "guess-repondant": () => ({
    data: data(state({ phase: "guessing", inventory: ["choix"] }), [guessing({ joker_keyword: "week-end", joker_topic: "Nos retrouvailles" })], undefined, ["r5"]),
    user: "u0",
  }),
  judging: () => ({ data: data(state({ phase: "judging" }), [guessing({ guess_text: "…" })]), user: "u1" }),
  "reveal-3": () => ({ data: data(state({ phase: "reveal" }), [revealed({})], undefined, ["r5"]), user: "u1" }),
  "reveal-5": () => ({
    data: data(state({ phase: "reveal" }), [revealed({ llm_score: 5, originality_bonus: true, llm_comment: "Dans le mille ! Vous lisez dans les pensées l'un de l'autre." })], undefined, ["r5"]),
    user: "u1",
  }),
  "reveal-0": () => ({
    data: data(state({ phase: "reveal" }), [revealed({ llm_score: 0, llm_comment: "Aucun rapport, mais quelle imagination !" })], undefined, ["r5"]),
    user: "u1",
  }),
  "reveal-coeur": () => ({ data: data(state({ phase: "reveal" }), [revealed({ heart: true, continue_votes: [1] })], undefined, ["r5"]), user: "u0" }),
  "reveal-manuel": () => ({
    data: data(state({ phase: "reveal" }), [revealed({ llm_score: null, judge_failed: true, llm_comment: "Le juge fait la sieste… c'est vous qui notez ce tour !" })], undefined, ["r5"]),
    user: "u1",
  }),
  appel: () => ({ data: data(state({ phase: "appeal", appeal_used: true }), [revealed({ appeal_scores: { "0": 4 } })], undefined, ["r5"]), user: "u1" }),
  "roue": () => ({ data: data(state({ position: 12 }), [spun({}), answering("mot")]), user: "u0" }),
  "roue-piege": () => ({
    data: data(state({ position: 21 }), [
      spun({ case_index: 22, wheel_level: 0, wheel_index: 1, wheel_result: 2, final_score: 1, landed_index: 24, position_after: 21, case_effect: { type: "piege", label: "Piège !", delta: -3 } }),
      answering("mot"),
    ]),
    user: "u0",
  }),
  "roue-chance": () => ({
    data: data(state({ position: 30 }), [
      spun({ case_index: 24, wheel_index: 0, wheel_result: 3, landed_index: 27, position_after: 30, case_effect: { type: "chance", label: "Raccourci secret", delta: 3 } }),
      answering("mot"),
    ]),
    user: "u0",
  }),
  "roue-arrivee": () => ({
    data: data(state({ phase: "finished", outcome: "win", position: 63 }), [spun({ case_index: 59, wheel_index: 2, wheel_result: 4, landed_index: 63, position_after: 63 })]),
    user: "u0",
  }),
  "fin-gagne": () => {
    const f = finished("win");
    return { data: data(f.game, f.rounds), user: "u0", markAnimated: "f4" };
  },
  "fin-perdu": () => {
    const f = finished("lose");
    return { data: data(f.game, f.rounds), user: "u0", markAnimated: "f4" };
  },
  plateau: () => ({ data: data(state({ phase: "guessing" }), [guessing()]), user: "u1", boardOpen: true }),
};

export const PREVIEW_SCREENS = ["accueil", ...Object.keys(SCREENS)];

export function Preview({ screen }: { screen: string }) {
  if (screen === "accueil") return <Home initialCode="" onEnter={() => {}} />;
  const make = SCREENS[screen];
  if (!make) {
    return (
      <ul className="mx-auto max-w-md p-6 font-display text-lg">
        {PREVIEW_SCREENS.map((s) => (
          <li key={s}>
            <a className="underline" href={`/?apercu=${s}`}>
              {s}
            </a>
          </li>
        ))}
      </ul>
    );
  }
  const s = make();
  if (s.markAnimated) {
    try {
      localStorage.setItem(`dlq:anim:${ROOM}`, s.markAnimated);
    } catch {
      /* rien */
    }
  }
  const noop = async () => {};
  return <GameView data={s.data} userId={s.user} onlineSeats={[0, 1]} onQuit={noop} onReset={noop} initialBoardOpen={s.boardOpen} />;
}
