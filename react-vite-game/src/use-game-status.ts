import { useMemo } from "react";
import { GameState } from "./Game";

export default function useGameStatus(gameState: GameState, myMove: boolean) {
  const { hlines, vlines, isGameOver, opponent, squares } = gameState;
  return useMemo<string>(() => {
    const allLines = [...hlines, ...vlines].flat();
    const noMovesPlayed = !allLines.filter(Boolean).length;
    const opponentString = opponent === "computer" ? "Computer" : "Opponent";
    if (isGameOver) {
        const player1Score = squares.flat().filter((s) => s === 1).length;
        const player2Score = squares.flat().filter((s) => s === 2).length;
        if (player1Score > player2Score) {
            return "YOU WON!";
        } else if (player1Score < player2Score) {
            return "YOU SUCK";
        } else {
            return "It's a tie!";
        }
    } else if (noMovesPlayed) {
        return `Game on! ${myMove ? 'You start' : `${opponentString} starts!`}`;
    } else {
        return myMove ? 'Your turn' : `${opponentString} turn`;
    }
}, [gameState]);
}
