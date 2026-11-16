import { type CaseType, type Category, FINISH, MAX_TURNS, SPICY2_FROM } from "@rules";
import type { IconName } from "./Icon";

/**
 * Apparence de chaque type de case (plateau, infobulles, écran de la roue).
 * Cases réponse = lavis aquarelle ; cases spéciales = timbres ; départ et arrivée = cachets.
 */
export const CASE_STYLE: Record<
  CaseType,
  { kind: "lavis" | "timbre" | "cachet"; bg: string; icon: IconName; label: string; help: string }
> = {
  depart: { kind: "cachet", bg: "cachet", icon: "depart", label: "Départ", help: "Le premier tour se joue avec un mot." },
  arrivee: {
    kind: "cachet",
    bg: "cachet",
    icon: "arrivee",
    label: "Arrivée",
    help: `Atteignez la case ${FINISH} en ${MAX_TURNS} tours pour vous retrouver.`,
  },
  mot: { kind: "lavis", bg: "lavis-ocre", icon: "mot", label: "Un mot", help: "Répondre en un seul mot." },
  nombre: { kind: "lavis", bg: "lavis-bleu", icon: "nombre", label: "Un chiffre", help: "Répondre par un nombre." },
  emojis: { kind: "lavis", bg: "lavis-ocre-points", icon: "emojis", label: "Des emojis", help: "Répondre avec 1 à 3 emojis." },
  dessin: { kind: "lavis", bg: "lavis-sauge", icon: "dessin", label: "Un dessin", help: "Dessiner la réponse en 60 secondes." },
  photo: { kind: "lavis", bg: "lavis-rose", icon: "photo", label: "Une photo", help: "Prendre ou choisir une photo." },
  musique: {
    kind: "lavis",
    bg: "lavis-bleu-hachures",
    icon: "musique",
    label: "Une musique",
    help: "Choisir un morceau, l'autre écoute un extrait.",
  },
  gif: { kind: "lavis", bg: "lavis-sauge-hachures", icon: "gif", label: "Un GIF", help: "Choisir un GIF animé." },
  chance: { kind: "timbre", bg: "timbre", icon: "chance", label: "Chance", help: "Une carte fait avancer de 1 à 3 cases." },
  malchance: { kind: "timbre", bg: "timbre", icon: "malchance", label: "Malchance", help: "Une carte fait reculer de 1 à 3 cases." },
  piege: { kind: "timbre", bg: "timbre", icon: "piege", label: "Piège", help: "Recule de 3 cases." },
  tremplin: { kind: "timbre", bg: "timbre", icon: "tremplin", label: "Tremplin", help: "Avance de 2 cases." },
};

/** Rappel affiché dans l'infobulle des timbres. */
export const TIMBRE_NOTE = "Le tour suivant se joue avec le média de la dernière case réponse.";

/** Forme irrégulière, rotation et décalage fixes d'une case, déduits de son numéro. */
export function caseLook(index: number) {
  return {
    shape: `forme-${(index % 4) + 1}`,
    rotate: ((index * 37) % 7) - 3, // −3° à +3°
    shift: ((index * 53) % 5) - 2, // −2 à +2 (en % de la case)
  };
}

/** Catégories de questions : couleur (lavis), icône au trait et description. */
export const CATEGORY_STYLE: Record<Category, { label: string; icon: IconName; bg: string; help: string }> = {
  mignon: { label: "Mignon", icon: "fleur", bg: "lavis-rose", help: "Tendresse, souvenirs, petits gestes, projets à deux" },
  drole: { label: "Drôle", icon: "rire", bg: "lavis-ocre", help: "Absurde, « tu préfères… », fous rires" },
  spicy: { label: "Spicy", icon: "piment", bg: "lavis-cachet-hachures", help: "Séduction et complicité, jamais explicite" },
  profond: { label: "Profond", icon: "pensee", bg: "lavis-bleu", help: "La distance, les peurs, les envies, ce qui manque" },
};

/** Rappel du niveau 🌶️🌶️, affiché dans les réglages et les infobulles. */
export const SPICY2_NOTE = `Plus osé à partir de la case ${SPICY2_FROM}`;
