import { useMemo } from "react";
import { ClientGameV2, UserInfo } from "../../commonts/types";

export default function useGameStatus({ meta, state }: ClientGameV2) {
  const { myPlayerId, winnerUsername } = meta;
  const { hlines, vlines, isGameOver, squares, currentPlayer } = state;
  const isMyMove = currentPlayer === myPlayerId;
  return useMemo<string>(() => {
    const allLines = [...hlines, ...vlines].flat();
    const noMovesPlayed = !allLines.filter(Boolean).length;
    if (isGameOver) {
      return `${winnerUsername} Wins!`;
      // const youScore = squares.flat().filter((s) => s === myPlayerId).length;
      // const opponentScore = squares.flat().filter((s) => s !== myPlayerId).length;
      
      // if (youScore > opponentScore) {
      //   return "YOU WON!";
      // } else if (youScore < opponentScore) {
      //   return `${winnerUsername} WINS`;
      // } else {
      //   return "It's a tie!";
      // }
    } else if (noMovesPlayed) {
      return `Game On! ${isMyMove ? 'You Start' : `${currentPlayer} Starts!`}`;
    } else {
      return isMyMove ? 'Your Turn' : `${currentPlayer} Turn`;
    }
  }, [meta, state]);
}
