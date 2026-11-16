import { FINISH, MAX_TURNS } from "@rules";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { SoundMenu } from "./SoundMenu";

/**
 * Barre d'état des écrans de jeu : tour X/24, case Y/63, partenaire, puis les boutons
 * plateau, son et menu de partie. Sur téléphone, les boutons n'affichent que leur icône.
 */
export function StatusBar({
  position,
  turn,
  partnerName,
  partnerOnline,
  boardOpen,
  onToggleBoard,
  menu,
}: {
  position: number;
  turn: number;
  partnerName: string;
  partnerOnline: boolean;
  boardOpen: boolean;
  onToggleBoard: () => void;
  menu: ReactNode;
}) {
  const left = FINISH - position;
  return (
    <div className="feuille flex items-center gap-3 px-3.5 py-2 sm:px-4">
      <div className="min-w-0 flex-1">
        <p className="font-display text-[16px] leading-tight font-bold whitespace-nowrap sm:text-[17px]">
          Tour {Math.min(turn, MAX_TURNS)}/{MAX_TURNS} · case {position}/{FINISH}
        </p>
        <p className="flex items-center gap-1.5 text-[13px] leading-snug text-muted italic sm:text-[14px]">
          <span className={`h-2 w-2 shrink-0 rounded-full ${partnerOnline ? "bg-sauge ring-1 ring-encre/50" : "bg-encre/20"}`} />
          <span className="truncate">
            {partnerName} {partnerOnline ? "en ligne" : "hors ligne"}
            <span className="hidden sm:inline">{left > 0 ? ` · encore ${left} case${left > 1 ? "s" : ""}` : ""}</span>
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleBoard}
          aria-pressed={boardOpen}
          aria-label={boardOpen ? "Masquer le plateau" : "Voir le plateau"}
          className={`pilule flex min-h-11 min-w-11 items-center justify-center gap-1.5 border-[1.5px] border-encre/60 px-2.5 font-display font-bold sm:px-3.5 ${
            boardOpen ? "bg-ocre/60" : "bg-lettre"
          }`}
        >
          <Icon name="plateau" size={20} /> <span className="hidden sm:inline">Plateau</span>
        </button>
        <SoundMenu />
        {menu}
      </div>
    </div>
  );
}
