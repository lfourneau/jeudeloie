import { FINISH, MAX_TURNS } from "@rules";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * Barre d'état des écrans de jeu : tour X/24, case Y/63, partenaire, bouton pour afficher le plateau
 * et menu de partie. Le plateau lui-même n'apparaît qu'entre deux manches ou à la demande.
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
    <div className="feuille flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-display text-[17px] font-bold">
          Tour {Math.min(turn, MAX_TURNS)}/{MAX_TURNS} · case {position}/{FINISH}
        </p>
        <p className="flex min-w-0 items-center gap-1.5 truncate text-[14px] text-muted italic">
          <span className={`h-2 w-2 shrink-0 rounded-full ${partnerOnline ? "bg-sauge ring-1 ring-encre/50" : "bg-encre/20"}`} />
          {partnerName} {partnerOnline ? "est connecté·e" : "est hors ligne"}
          {left > 0 ? ` · encore ${left} case${left > 1 ? "s" : ""}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleBoard}
          aria-pressed={boardOpen}
          className={`pilule flex min-h-11 items-center gap-1.5 border-[1.5px] border-encre/60 px-3.5 font-display font-bold ${
            boardOpen ? "bg-ocre/60" : "bg-lettre"
          }`}
        >
          <Icon name="plateau" size={20} /> {boardOpen ? "Masquer le plateau" : "Plateau"}
        </button>
        {menu}
      </div>
    </div>
  );
}
