import { useMemo } from "react";
import { ClientGameV2, UserInfo } from "../../commonts/types";

export default function useGameStatus({ meta, state }: ClientGameV2, userInfo: UserInfo) {
  const { userID } = userInfo;
  const { opponent } = meta;
  const { hlines, vlines, isGameOver, squares, currentPlayer } = state;
  const isMyMove = currentPlayer === userID;
  return useMemo<string>(() => {
    const allLines = [...hlines, ...vlines].flat();
    const noMovesPlayed = !allLines.filter(Boolean).length;
    const opponentString = opponent === "computer" ? "Computer" : "Opponent";
    if (isGameOver) {
      const youScore = squares.flat().filter((s) => s === userID).length;
      const opponentScore = squares.flat().filter((s) => s !== userID).length;
      if (youScore > opponentScore) {
        return "YOU WON!";
      } else if (youScore < opponentScore) {
        return "YOU SUCK";
      } else {
        return "It's a tie!";
      }
    } else if (noMovesPlayed) {
      return `Game on! ${isMyMove ? 'You start' : `${opponentString} starts!`}`;
    } else {
      return isMyMove ? 'Your turn' : `${opponentString} turn`;
    }
  }, [meta, state]);
}
