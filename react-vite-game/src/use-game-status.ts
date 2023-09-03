import { useMemo } from "react";
import { ClientGameV2, UserInfo } from "../../commonts/types";

export default function useGameStatus({ meta, state }: ClientGameV2) {
  const { opponent, myPlayerId } = meta;
  const { hlines, vlines, isGameOver, squares, currentPlayer } = state;
  const isMyMove = currentPlayer === myPlayerId;
  return useMemo<string>(() => {
    const allLines = [...hlines, ...vlines].flat();
    const noMovesPlayed = !allLines.filter(Boolean).length;
    const opponentString = opponent === "computer" ? "Computer" : "Opponent";
    if (isGameOver) {
      const youScore = squares.flat().filter((s) => s === myPlayerId).length;
      const opponentScore = squares.flat().filter((s) => s !== myPlayerId).length;
      if (youScore > opponentScore) {
        return "YOU WON!";
      } else if (youScore < opponentScore) {
        return "YOU SUCK";
      } else {
        return "It's a tie!";
      }
    } else if (noMovesPlayed) {
      return `Game on! ${isMyMove ? 'You start' : `${opponentString} starts! ${currentPlayer} ${opponent}`}`;
    } else {
      return isMyMove ? 'Your turn' : `${opponentString} turn`;
    }
  }, [meta, state]);
}
