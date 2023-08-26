import React, { useEffect } from 'react';
import { useMemo, useRef, useState } from 'react'
import drawBoard from './game-rendering';
import { updateLine } from './update-line';

type GameProps = {
  gridSize: number;
  opponent: 'computer' | 'human';
  onReset: () => void;
  onGoHome: () => void;
}

type LineArray<T = string | null> = T[][];

type ChosenMove = ['h' | 'v', number, number];

export type GameState = {
  hlines: LineArray;
  vlines: LineArray;
  gridSize: number;
  squares: LineArray<number>;
  currentPlayer: number;
}


const SCREEN_SIZE = 600;
const SCORE_AREA_HEIGHT = 100;
const WINDOW_SIZE = SCREEN_SIZE + SCORE_AREA_HEIGHT;
const RED = "#ff0000";
const BLUE = "#0000ff";
const PLAYER_COLORS = [RED, BLUE];



function Game({ gridSize, opponent, onReset, onGoHome }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [hlines, setHlines] = useState<GameState["hlines"]>(Array.from({ length: gridSize + 1 }, () => Array.from({ length: gridSize }, () => null)));
  const [vlines, setVlines] = useState<GameState["vlines"]>(Array.from({ length: gridSize }, () => Array.from({ length: gridSize + 1 }, () => null)));
  const [squares, setSquares] = useState<GameState["squares"]>(Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => 0)));
  const [humanTurn, setHumanTurn] = useState(true);

  const renderCanvas = () => {
    if (!canvasRef.current) return;
    const gameState: GameState = {
      hlines,
      vlines,
      squares,
      gridSize,
      currentPlayer,
    }
    console.log('rendering canvas');
    drawBoard(canvasRef.current, gameState);
  };

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    console.log('HLINES HAVE CHANGED')
    renderCanvas();
  }, [hlines, vlines]);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    canvasEl.width = WINDOW_SIZE - SCORE_AREA_HEIGHT;
    canvasEl.height = WINDOW_SIZE;

    // Set the canvas display size
    canvasEl.style.width = `${WINDOW_SIZE - SCORE_AREA_HEIGHT}px`;
    canvasEl.style.height = `${WINDOW_SIZE}px`;
    renderCanvas();
  }, [canvasRef]);

  const isGameOver = (() => {
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (squares[i][j] === 0) {
          return false;
        }
      }
    }
    return true;
  })();

  const calcStatus = useMemo(() => {
    console.log('calcing status');
    const allLines = [...hlines, ...vlines].flat();
    const noMovesPlayed = !allLines.filter(Boolean).length;

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
      return `Game on! ${humanTurn ? 'You start' : 'Computer starts!'}`;
    } else {
      return humanTurn ? 'Your turn' : 'Computer turn';
    }


  }, [hlines, vlines]);
  console.log({ canvasRef });



  function handleCanvasClick(event: { clientX: number; clientY: number; }) {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const gameState: GameState = {
      hlines,
      vlines,
      squares,
      gridSize,
      currentPlayer,
    }
    const { squareCompleted, updatedGameState } = updateLine(x, y, gameState);
    setHlines(updatedGameState.hlines);
    setVlines(updatedGameState.vlines);
    setSquares(updatedGameState.squares);
    console.log({ squareCompleted })
  };

  return (
    <div id="game-section">
      <h2 id="game-status">{calcStatus}</h2>
      <canvas id="game-canvas" ref={canvasRef} onClick={handleCanvasClick}></canvas>
      <div className="button-container">
        <button id="reset-game" onClick={() => onReset()}>Reset Game</button>
        <button id="go-home" onClick={() => onGoHome()}>Go Home</button>
      </div>
    </div>
  );
};

export default Game;