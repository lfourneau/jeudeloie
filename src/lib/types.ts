import type { Category, Media, Phase } from "@rules";

export interface Room {
  id: string;
  code: string;
  status: "lobby" | "playing" | "finished";
}

export interface Player {
  id: string;
  room_id: string;
  user_id: string;
  name: string;
  seat: 0 | 1;
}

export interface GameState {
  room_id: string;
  phase: Phase;
  turn_number: number;
  turns_counted: number;
  answerer_seat: 0 | 1;
  position: number;
  appeal_used: boolean;
  /** Jokers encore disponibles, communs aux deux joueurs. */
  inventory: string[];
  /** Catégories de questions actives, choisies par l'hôte. */
  categories: Category[];
  current_round_id: string | null;
  outcome: "win" | "lose" | null;
  pawn: string;
  version: number;
  updated_at: string;
}

export interface Round {
  id: string;
  room_id: string;
  turn_number: number;
  case_index: number;
  media: Media;
  answerer_seat: 0 | 1;
  answer_text: string | null;
  answer_media_path: string | null;
  answer_media: MusicMedia | GifMedia | LinkMedia | null;
  guess_text: string | null;
  llm_score: number | null;
  llm_comment: string | null;
  judge_failed: boolean;
  originality_bonus: boolean;
  heart: boolean;
  appeal_scores: Record<string, number>;
  appeal_manual: boolean;
  final_score: number | null;
  wheel_level: number | null;
  wheel_index: number | null;
  wheel_result: number | null;
  landed_index: number | null;
  case_effect: { type: string; label: string; delta: number } | null;
  position_after: number | null;
  revealed: boolean;
  continue_votes: number[];
  joker_keyword: string | null;
  joker_topic: string | null;
  joker_choices: string[] | null;
  /** Catégorie de la question (null : section générique). */
  categorie: Category | null;
  niveau: 1 | 2 | null;
  /** Cases mot et nombre : nature de la réponse, montrée au devineur (« un lieu »). */
  contexte: string | null;
}

/** Photo venue d'un lien : l'image est effacée du stockage dès la fin du tour. */
export interface LinkMedia {
  kind: "lien";
  efface: boolean;
}

export interface Secret {
  round_id: string;
  question_text: string;
  theme: string;
}

export interface MusicMedia {
  kind: "musique";
  id: string;
  title: string;
  artist: string;
  cover: string;
  preview: string;
}

export interface GifMedia {
  kind: "gif";
  id: string;
  title: string;
  url: string;
  still: string;
  width: number;
  height: number;
}
