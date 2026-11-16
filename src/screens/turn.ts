import type { Player, Round, Secret } from "../lib/types";
import type { GameData } from "../lib/useGame";

/** Ce que chaque écran de tour reçoit. */
export interface TurnProps {
  data: GameData;
  round: Round;
  secret: Secret | undefined;
  me: Player;
  partner: Player;
  isAnswerer: boolean;
}
