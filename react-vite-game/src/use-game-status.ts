import { useMemo } from "react";
import { GameProps, GameState } from "./Game";

export default function useGameStatus(gameState: GameState, gameProps: GameProps) {
  const { hlines, vlines, isGameOver, opponent, squares, currentPlayer} = gameState;
  const myMove = currentPlayer === gameProps.myPlayerId;
  return useMemo<string>(() => {
    const allLines = [...hlines, ...vlines].flat();
    const noMovesPlayed = !allLines.filter(Boolean).length;
    const opponentString = opponent === "computer" ? "Computer" : "Opponent";
    if (isGameOver) {
        const youScore = squares.flat().filter((s) => s === gameProps.myPlayerId).length;
        const opponentScore = squares.flat().filter((s) => s !== gameProps.myPlayerId).length;
        if (youScore > opponentScore) {
            return "YOU WON!";
        } else if (youScore < opponentScore) {
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
