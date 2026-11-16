import type { ReactNode } from "react";

/** Petits dessins au trait d'encre (remplacent les emojis de l'interface). */
export type IconName =
  | "mot"
  | "nombre"
  | "emojis"
  | "dessin"
  | "photo"
  | "musique"
  | "gif"
  | "chance"
  | "malchance"
  | "piege"
  | "tremplin"
  | "depart"
  | "arrivee"
  | "coeur"
  | "etoile"
  | "horloge"
  | "gomme"
  | "annuler"
  | "fermer"
  | "lecture"
  | "pause"
  | "galerie"
  | "plume"
  | "enveloppe"
  | "balance"
  | "cle"
  | "etiquette"
  | "cartes"
  | "plateau"
  | "sortie"
  | "recommencer"
  | "menu"
  | "son"
  | "muet";

const PATHS: Record<IconName, ReactNode> = {
  // bulle avec deux lignes d'écriture
  mot: (
    <>
      <path d="M4.2 5.3c4.9-.9 10.6-.8 15.4.2.6 2.9.6 6.2-.1 9-2.6.6-5.7.7-8.4.5L6.6 18.6l.6-3.7c-1-.1-2-.3-2.9-.5-.7-3-.6-6.1-.1-9.1Z" />
      <path d="M7.6 9.1c2.8-.3 5.9-.2 8.7.1M7.8 12c2-.2 4.2-.1 6.1 0" />
    </>
  ),
  // dièse
  nombre: <path d="M9.6 4.2 8 19.8M16.2 4.3l-1.5 15.4M4.6 9.3c4.9-.4 9.9-.4 15.1 0M4.2 15c4.9-.3 9.9-.3 15 .1" />,
  // visage souriant
  emojis: (
    <>
      <path d="M12 3.6c4.9-.2 8.6 3.6 8.4 8.5-.2 4.6-3.8 8.3-8.5 8.3-4.7.1-8.5-3.6-8.4-8.3.1-4.7 3.7-8.4 8.5-8.5Z" />
      <path d="M8.3 14.2c2.1 2.5 5.4 2.6 7.5 0M9.2 9.4v.8M14.9 9.3v.8" />
    </>
  ),
  // crayon
  dessin: (
    <>
      <path d="M15.6 4.4 19.7 8.5 9 19.2l-5 1 .9-5.1Z" />
      <path d="M13.2 6.9l4 4M4.9 15.1l4.1 4.1" />
    </>
  ),
  // appareil photo
  photo: (
    <>
      <path d="M3.6 8.1c5.6-.5 11.2-.6 16.9 0 .4 3.6.4 7.4-.1 11-5.6.5-11.2.5-16.8 0-.5-3.7-.5-7.3 0-11Z" />
      <path d="M8.4 8 9.8 5.2c1.4-.2 3-.2 4.5 0l1.3 2.8" />
      <path d="M12 10.8c1.9-.1 3.1 1.2 3 2.9 0 1.7-1.3 2.9-3 2.9s-3-1.3-3-3c.1-1.6 1.3-2.8 3-2.8Z" />
    </>
  ),
  // deux croches
  musique: (
    <>
      <path d="M9 17.4V6.2l10.1-2.1v11" />
      <path d="M9 9.3l10.1-2.1" />
      <path d="M6.6 15.4c1.4-.1 2.5.8 2.4 2-.1 1.2-1.2 2.1-2.5 2.1s-2.3-.9-2.2-2.1c.1-1.1 1-2 2.3-2ZM16.7 13.1c1.4-.1 2.5.8 2.4 2-.1 1.2-1.2 2.1-2.5 2.1s-2.3-.9-2.2-2.1c.1-1.1 1-2 2.3-2Z" />
    </>
  ),
  // pellicule
  gif: (
    <>
      <path d="M5.2 3.8c4.6-.3 9.1-.3 13.6 0 .4 5.5.4 11 0 16.4-4.5.3-9 .3-13.6 0-.4-5.5-.4-10.9 0-16.4Z" />
      <path d="M8.5 4v16M15.5 4v16M8.6 12h6.8M5.3 7.6h3M5.3 12h3M5.3 16.4h3M15.6 7.6h3M15.6 12h3M15.6 16.4h3" />
    </>
  ),
  // trèfle à quatre feuilles
  chance: (
    <>
      <path d="M12 11.5C8.7 9.4 8.4 5.7 10.3 5.2c1.1-.3 1.7.5 1.7 1.3 0-.8.7-1.6 1.8-1.3 1.9.6 1.4 4.2-1.8 6.3Z" />
      <path d="M12 12.5c-3.3 2.1-3.6 5.8-1.7 6.3 1.1.3 1.7-.5 1.7-1.3 0 .8.7 1.6 1.8 1.3 1.9-.6 1.4-4.2-1.8-6.3Z" />
      <path d="M11.5 12C9.4 8.7 5.7 8.4 5.2 10.3c-.3 1.1.5 1.7 1.3 1.7-.8 0-1.6.7-1.3 1.8.6 1.9 4.2 1.4 6.3-1.8Z" />
      <path d="M12.5 12c2.1-3.3 5.8-3.6 6.3-1.7.3 1.1-.5 1.7-1.3 1.7.8 0 1.6.7 1.3 1.8-.6 1.9-4.2 1.4-6.3-1.8Z" />
      <path d="M13 13.4c1.6 2.3 2.9 4.6 3.3 7.2" />
    </>
  ),
  // nuage de pluie
  malchance: (
    <>
      <path d="M6.8 14.5C3.9 14.6 3 11 5.6 9.9c.1-3 3.8-4.4 5.9-2.4 1.5-2.7 6.4-2 6.6 1.6 2.9.1 3.7 4.9.3 5.4-3.9.3-7.7.2-11.6 0Z" />
      <path d="M8.2 17.1 7.3 19.3M12.2 17.2l-.9 2.4M16.2 17.1l-.9 2.2" />
    </>
  ),
  // trou dans le chemin
  piege: (
    <>
      <path d="M3.8 13.9c.2-2.4 3.9-3.9 8.2-3.9s8 1.5 8.1 3.9c0 2.4-3.6 4.1-8.1 4.1s-8.3-1.7-8.2-4.1Z" />
      <path d="M7.4 14.6c1.4-1.4 7.8-1.5 9.3-.1M12 4.2v3.2M8.4 5.3l.9 2.4M15.6 5.3l-.9 2.4" />
    </>
  ),
  // ressort et flèche
  tremplin: (
    <>
      <path d="M5 20.2c4.6-.3 9.4-.3 14 0M7 17.6c3.4-.8 6.9-.8 10 0-3.1-.9-6.6-1-10-1.7 3.4-.9 6.9-.9 10-.1" />
      <path d="M12 13.2V3.8M8.6 7.1 12 3.7l3.4 3.4" />
    </>
  ),
  depart: <path d="M6 20.4V3.8c3.9-1.4 7.7 1.6 12 .1v8.6c-4.3 1.4-8.1-1.5-12-.1" />,
  arrivee: (
    <path d="M12 19.8C5.1 15.6 3 11.6 4.1 8.5 5.4 5 9.9 4.8 12 8c2.1-3.2 6.6-3 7.9.5 1.1 3.1-1 7.1-7.9 11.3Z" />
  ),
  coeur: (
    <path d="M12 19.8C5.1 15.6 3 11.6 4.1 8.5 5.4 5 9.9 4.8 12 8c2.1-3.2 6.6-3 7.9.5 1.1 3.1-1 7.1-7.9 11.3Z" />
  ),
  etoile: (
    <path d="M12 3.4l2.5 5.4 5.9.6-4.4 4 1.3 5.8L12 16.3l-5.2 2.9 1.2-5.8-4.4-4 5.9-.6Z" />
  ),
  horloge: (
    <>
      <path d="M12 3.6c4.8-.1 8.5 3.7 8.4 8.5-.1 4.6-3.8 8.3-8.5 8.3-4.7 0-8.4-3.7-8.4-8.4.1-4.6 3.8-8.3 8.5-8.4Z" />
      <path d="M12 7.2v5.1l3.2 2" />
    </>
  ),
  gomme: (
    <>
      <path d="M14.2 4.6 20 10.4l-8.6 8.7H7.2l-3-3Z" />
      <path d="M9.9 9 15.6 14.7M11.4 19.1h8.4" />
    </>
  ),
  annuler: (
    <>
      <path d="M8.6 5.4 4.4 9.6l4.2 4.2" />
      <path d="M4.6 9.6h9.6c3.2 0 5.6 2.4 5.5 5.3-.1 2.8-2.4 4.9-5.4 4.9H10" />
    </>
  ),
  fermer: <path d="M6 6.2 18 17.8M17.8 6 6.2 18" />,
  lecture: <path d="M8 5.2c4.1 2 7.6 4.3 10.4 6.8-2.9 2.6-6.4 4.9-10.4 6.8-.4-4.5-.4-9 0-13.6Z" />,
  pause: <path d="M8.6 5.4v13.2M15.4 5.4v13.2" />,
  galerie: (
    <>
      <path d="M3.6 5.2c5.6-.4 11.2-.4 16.8 0 .4 4.6.4 9.1 0 13.6-5.6.4-11.2.4-16.8 0-.4-4.5-.4-9 0-13.6Z" />
      <path d="M4 16.4 9 11.6l3.6 3.4 2.6-2.4 4.8 4.4M15.4 8.4h.1" />
    </>
  ),
  plume: (
    <>
      <path d="M19.8 4.2C12.6 4.6 7.4 9.4 6.2 17.4c6.6-1.2 11.6-5.6 13.6-13.2Z" />
      <path d="M4.2 19.8 13.4 10.6" />
    </>
  ),
  enveloppe: (
    <>
      <path d="M3.6 6.2c5.6-.4 11.2-.4 16.8 0 .4 3.9.4 7.8 0 11.6-5.6.4-11.2.4-16.8 0-.4-3.8-.4-7.7 0-11.6Z" />
      <path d="M3.9 6.6 12 13l8.1-6.4" />
    </>
  ),
  balance: (
    <>
      <path d="M12 3.8v16.4M7.6 20.2h8.8M4.6 7.2c4.9-1.2 9.9-1.2 14.8 0" />
      <path d="M5.4 7.4 3 13c1.4 1.4 3.6 1.4 5 0L5.4 7.4ZM18.6 7.4 16 13c1.4 1.4 3.6 1.4 5 0l-2.4-5.6Z" />
    </>
  ),
  // clé ancienne (joker « mot-clé »)
  cle: (
    <>
      <path d="M8.2 5.4c2.5-.1 4.4 1.8 4.3 4.2-.1 2.3-2 4.1-4.3 4.1-2.4 0-4.2-1.9-4.1-4.2.1-2.3 1.8-4 4.1-4.1Z" />
      <path d="M12.2 11.4c2.6 2.4 5 4.9 7.4 7.6M16.2 15.6l1.9-1.8M18.2 17.8l1.6-1.5M7.4 8.6c.6-.4 1.3-.4 1.9.1" />
    </>
  ),
  // étiquette à ficelle (joker « thème »)
  etiquette: (
    <>
      <path d="M11.4 4.2c2.9-.1 5.9-.1 8.6.1.2 2.8.2 5.7 0 8.6l-7.4 7.4c-.6.6-1.5.6-2.1 0l-6.6-6.6c-.6-.6-.6-1.5 0-2.1Z" />
      <path d="M16.3 7.8h.1M16.4 7.8C14.8 5.6 12.2 3.4 9.6 3" />
    </>
  ),
  // trois cartes en éventail (joker « trois propositions »)
  cartes: (
    <>
      <path d="M3.6 8.4 8.2 6.8l3.6 10.6-4.6 1.6Z" />
      <path d="M9.4 4.6c1.6-.1 3.3-.1 4.9.1.2 3.8.2 7.6 0 11.4-1.6.2-3.3.2-4.9 0" />
      <path d="M15.6 6.9 20.4 8.3l-3 10.8-4.7-1.4" />
    </>
  ),
  // petit plateau en spirale
  plateau: (
    <>
      <path d="M3.8 4.1c5.5-.4 10.9-.4 16.4 0 .4 5.3.4 10.6 0 15.8-5.5.4-10.9.4-16.4 0-.4-5.2-.4-10.5 0-15.8Z" />
      <path d="M7.4 16.6V7.6h9.2v8.8h-6.2v-5.6h3.2v2.6" />
    </>
  ),
  // porte entrouverte et flèche
  sortie: (
    <>
      <path d="M13.6 4.2c-2.8-.2-5.6-.2-8.4 0-.3 5.2-.3 10.4 0 15.6 2.8.2 5.6.2 8.4 0" />
      <path d="M10 12.1c3.3-.1 6.6-.1 10 0M16.8 8.8l3.3 3.3-3.3 3.2" />
    </>
  ),
  // flèche qui revient au départ
  recommencer: (
    <>
      <path d="M5.2 12.4c-.3-4 2.9-7.4 6.9-7.4 3.9 0 7 3.1 6.9 7-.1 3.9-3.2 6.9-7 6.9-2.2 0-4.1-.9-5.4-2.5" />
      <path d="M2.8 9.6 5.2 12.6l3-2.3" />
    </>
  ),
  // trois traits tremblés
  // haut-parleur et ondes
  son: (
    <>
      <path d="M4.2 9.4c1.4-.2 2.8-.2 4.2 0l4.6-4c.4 4.4.4 8.8 0 13.2l-4.6-4c-1.4.2-2.8.2-4.2 0-.3-1.7-.3-3.5 0-5.2Z" />
      <path d="M16.2 9.2c1.2 1.7 1.2 3.9 0 5.6M18.8 6.8c2.4 3.2 2.4 7.2 0 10.4" />
    </>
  ),
  // haut-parleur barré
  muet: (
    <>
      <path d="M4.2 9.4c1.4-.2 2.8-.2 4.2 0l4.6-4c.4 4.4.4 8.8 0 13.2l-4.6-4c-1.4.2-2.8.2-4.2 0-.3-1.7-.3-3.5 0-5.2Z" />
      <path d="M16 9.4l4.4 5.2M20.4 9.4 16 14.6" />
    </>
  ),
  menu: <path d="M4.6 7.2c4.9-.3 9.9-.3 14.8 0M4.4 12.1c5-.2 10.1-.2 15.2.1M4.8 16.9c4.8-.3 9.6-.3 14.4 0" />,
};

export function Icon({
  name,
  size = 24,
  className = "",
  strokeWidth = 1.7,
  fill = "none",
  label,
}: {
  name: IconName;
  size?: number | string;
  className?: string;
  strokeWidth?: number;
  fill?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      style={{ width: size, height: size }}
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {PATHS[name]}
    </svg>
  );
}

/** Le juge : un petit mouton à toque, dessiné à l'encre. */
export function Sheep({ size = 72, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      style={{ width: size, height: size }}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="Le mouton juge"
      stroke="#1F2F4A"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* pattes */}
      <path d="M27 60v10M35 62v9M48 62v9M56 60v10" fill="none" />
      {/* laine */}
      <path
        d="M20 50c-6-2-6-10 0-12-2-7 6-11 10-7 2-6 11-6 13 0 4-5 12-2 11 5 6 0 8 8 2 11 3 6-3 11-8 8-3 5-11 5-14 0-5 4-12 1-12-5-2 1-3 1-2 0Z"
        fill="#FBF6EC"
      />
      <path d="M30 46c2-2 4-2 6 0M44 50c2-2 4-2 6 0" fill="none" strokeWidth={1.4} opacity={0.6} />
      {/* tête */}
      <path d="M53 30c5-1 10 3 10 9s-4 11-9 11-8-5-8-10 2-9 7-10Z" fill="#2B4366" />
      <path d="M47 33c-4-1-7 1-7 3 3 1 5 0 7-1ZM62 31c3-2 6-1 7 1-2 2-5 2-7 1Z" fill="#2B4366" />
      <path d="M52 39.5v1M58 39v1" stroke="#FBF6EC" strokeWidth={2.4} />
      <path d="M53 45c1.6 1.2 3.4 1.2 5 0" stroke="#FBF6EC" strokeWidth={1.4} fill="none" />
      {/* toque de juge */}
      <path d="M47 27.5c4-2 11-2.6 16-.6l-1-8c-4-1.6-10-1.2-14 .6Z" fill="#1F2F4A" />
      <path d="M47.2 26c5-1.8 10.6-2 15.6-.4" stroke="#B5442E" strokeWidth={1.6} fill="none" />
    </svg>
  );
}
