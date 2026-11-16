import type { ReactNode } from "react";

/** Les 12 pions (ids de PAWNS dans rules.ts), dessinés au trait sur un disque d'encre. */
const DRAWINGS: Record<string, { label: string; d: ReactNode }> = {
  oie: {
    label: "Oie",
    d: (
      <>
        <path d="M9 21c0-4 3.5-6 7.5-6 2 0 3-1.4 3-3.6V9.2c0-1.6 1.2-2.7 2.6-2.7s2.4 1 2.4 2.4" />
        <path d="M24.5 8.9 27 9.8l-2.5.9" />
        <path d="M9 21c1 3 4 4.4 8 4.4 4.6 0 7.3-2.6 7.6-6.4" />
        <path d="M13 20.4c1.8 1 4.2 1.1 6 0" />
      </>
    ),
  },
  tortue: {
    label: "Tortue",
    d: (
      <>
        <path d="M7 19.6c.5-5.4 4.4-8.6 9-8.6s8.4 3.2 8.6 8.6c-5.8.6-11.8.6-17.6 0Z" />
        <path d="M24.6 17.4c1.8-.6 3.1.2 3.2 1.4.1 1.1-1 1.8-3 1.5M10 20.2l-.8 3M21.6 20.2l.8 3M12 15.4l3.8 1.8 4-1.8M15.8 11.2v6" />
      </>
    ),
  },
  renard: {
    label: "Renard",
    d: (
      <>
        <path d="M7.4 8.2 11.6 13M24.6 8.2 20.4 13" />
        <path d="M7.4 8.2c-.6 5.6 1.2 10.6 8.6 16.4 7.4-5.8 9.2-10.8 8.6-16.4-2.4 2-5.4 3.4-8.6 3.4s-6.2-1.4-8.6-3.4Z" />
        <path d="M12.6 16.4v.6M19.4 16.4v.6M15 21.6c.6.4 1.4.4 2 0" />
      </>
    ),
  },
  chat: {
    label: "Chat",
    d: (
      <>
        <path d="M8.6 13.4 8 6.8l5 3.6c2-.6 4-.6 6 0l5-3.6-.6 6.6c1.2 5.4-2.6 10-7.4 10s-8.6-4.6-7.4-10Z" />
        <path d="M13 15.6v.6M19 15.6v.6M15.2 19.2h1.6M5 18.4l5 .4M27 18.4l-5 .4M5.6 21.4l4.6-1M26.4 21.4l-4.6-1" />
      </>
    ),
  },
  escargot: {
    label: "Escargot",
    d: (
      <>
        <path d="M6 23.6c6 .4 13.6.4 21 0" />
        <path d="M14.4 23.4c-4.4-.4-6.6-3.6-6-7 .6-3.6 4-5.8 7.4-5 3 .6 4.6 3.4 4 6-.6 2.4-3 3.6-5 3-1.6-.6-2.4-2.2-1.8-3.6.4-1 1.6-1.4 2.4-.8" />
        <path d="M20.6 21.6c1.6-1.6 2.6-4 2.6-6.6M23.2 15V9.6M25.6 15.6l1.6-5" />
      </>
    ),
  },
  enveloppe: {
    label: "Enveloppe",
    d: (
      <>
        <path d="M6.4 9.6c6.4-.4 12.8-.4 19.2 0 .4 4.4.4 8.6 0 12.8-6.4.4-12.8.4-19.2 0-.4-4.2-.4-8.4 0-12.8Z" />
        <path d="M6.8 10.2 16 17l9.2-6.8M6.8 22l6.6-5.6M25.2 22l-6.6-5.6" />
      </>
    ),
  },
  avion: {
    label: "Avion en papier",
    d: (
      <>
        <path d="M5.6 15.4 26.6 7.2l-5 17.4-5.8-5.6Z" />
        <path d="M26.6 7.2 15.8 19l-.6 6 3.2-3.6" />
      </>
    ),
  },
  montgolfiere: {
    label: "Montgolfière",
    d: (
      <>
        <path d="M16 5.6c4.6 0 7.8 3.2 7.6 7.4-.2 3.6-3.6 6.4-5.6 8.6h-4c-2-2.2-5.4-5-5.6-8.6-.2-4.2 3-7.4 7.6-7.4Z" />
        <path d="M16 5.6c-2.2 3.8-2.6 10 0 16M14 21.6l.4 2.6M18 21.6l-.4 2.6M13.6 24.2h4.8v2.6h-4.8Z" />
      </>
    ),
  },
  bateau: {
    label: "Bateau",
    d: (
      <>
        <path d="M5.6 19.6c6.8-.4 13.8-.4 20.8 0-1.2 3-3.4 4.6-6.4 4.8-2.8.2-5.6.2-8.4 0-3-.2-5-1.8-6-4.8Z" />
        <path d="M16.6 19.4V5.6l-7.8 11.6c2.6.4 5.2.6 7.8.4M18.8 8.4c2.6 2.4 4 5.4 4.2 9" />
      </>
    ),
  },
  velo: {
    label: "Vélo",
    d: (
      <>
        <path d="M9.6 15.6c2.6 0 4.4 2 4.4 4.4s-2 4.4-4.4 4.4-4.4-2-4.4-4.4 1.8-4.4 4.4-4.4ZM22.4 15.6c2.6 0 4.4 2 4.4 4.4s-2 4.4-4.4 4.4S18 22.4 18 20s1.8-4.4 4.4-4.4Z" />
        <path d="M9.6 20 13.4 12.2h7.8L22.4 20M13.4 12.2 16.6 20h2M12.4 10.2h3M20.6 12.2l-.8-3.4h2.6" />
      </>
    ),
  },
  coeur: {
    label: "Cœur",
    d: (
      <path d="M16 25.6C8 20.6 5.6 16 6.8 12.4 8.2 8.4 13.6 8.2 16 11.8c2.4-3.6 7.8-3.4 9.2.6 1.2 3.6-1.2 8.2-9.2 13.2Z" />
    ),
  },
  etoile: {
    label: "Étoile",
    d: <path d="M16 5.4l3.2 6.8 7.4.8-5.6 5 1.6 7.4L16 21.6l-6.6 3.8 1.6-7.4-5.6-5 7.4-.8Z" />,
  },
};

export function pawnLabel(id: string) {
  return DRAWINGS[id]?.label ?? "Pion";
}

/** Pion commun : disque d'encre claire, dessin au trait couleur papier. */
export function Pawn({ id, size = 32, className = "", ring = true }: { id: string; size?: number | string; className?: string; ring?: boolean }) {
  const drawing = DRAWINGS[id] ?? DRAWINGS.oie;
  return (
    <svg
      viewBox="0 0 32 32"
      style={{ width: size, height: size }}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={`Pion : ${drawing.label}`}
    >
      <path
        d="M16 1.6c8.2-.2 14.6 6.2 14.4 14.4-.2 7.8-6.6 14.2-14.4 14.4C7.8 30.6 1.4 24.2 1.6 16 1.8 8 8 1.8 16 1.6Z"
        fill="#2B4366"
        stroke={ring ? "#FBF6EC" : "none"}
        strokeWidth={1.6}
      />
      <g fill="none" stroke="#FBF6EC" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        {drawing.d}
      </g>
    </svg>
  );
}
