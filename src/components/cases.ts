import type { CaseType } from "@rules";

/** Apparence et description de chaque type de case (plateau, mini-plateau, légende). */
export const CASE_STYLE: Record<CaseType, { fill: string; bg: string; icon: string; label: string; help: string }> = {
  depart: { fill: "fill-mint", bg: "bg-mint text-night", icon: "🏁", label: "Départ", help: "Le premier tour se joue avec un mot." },
  arrivee: { fill: "fill-gold", bg: "bg-gold text-night", icon: "💞", label: "Arrivée", help: "Atteignez-la en 15 tours pour gagner." },
  mot: { fill: "fill-sky", bg: "bg-sky", icon: "🔤", label: "Mot", help: "Répondre en un seul mot." },
  nombre: { fill: "fill-lilac", bg: "bg-lilac", icon: "🔢", label: "Nombre", help: "Répondre par un nombre." },
  emojis: { fill: "fill-rose", bg: "bg-rose", icon: "😍", label: "Emojis", help: "Répondre avec 1 à 3 emojis." },
  dessin: { fill: "fill-peach", bg: "bg-peach", icon: "🎨", label: "Dessin", help: "Dessiner la réponse en 60 secondes." },
  photo: { fill: "fill-teal", bg: "bg-teal", icon: "📷", label: "Photo", help: "Prendre ou choisir une photo." },
  musique: { fill: "fill-orchid", bg: "bg-orchid", icon: "🎵", label: "Musique", help: "Choisir un morceau, l'autre écoute un extrait." },
  gif: { fill: "fill-lime", bg: "bg-lime", icon: "🎞️", label: "GIF", help: "Choisir un GIF animé." },
  chance: { fill: "fill-gold", bg: "bg-gold text-night", icon: "🍀", label: "Chance", help: "Une carte fait avancer de 1 à 3 cases." },
  malchance: { fill: "fill-slate", bg: "bg-slate", icon: "🌧️", label: "Malchance", help: "Une carte fait reculer de 1 à 3 cases." },
  piege: { fill: "fill-ember", bg: "bg-ember", icon: "🕳️", label: "Piège", help: "Recule de 3 cases." },
  tremplin: { fill: "fill-mint", bg: "bg-mint text-night", icon: "🦘", label: "Tremplin", help: "Avance de 2 cases." },
};

export const LEGEND_GROUPS: { title: string; types: CaseType[] }[] = [
  { title: "Cases réponse", types: ["mot", "nombre", "emojis", "dessin", "photo", "musique", "gif"] },
  { title: "Cases spéciales", types: ["chance", "malchance", "tremplin", "piege"] },
];

export const LEGEND_NOTE = "Sur une case spéciale, le tour suivant se joue avec le média de la dernière case réponse.";
