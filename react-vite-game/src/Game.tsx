import React, { useEffect } from 'react';
import { useMemo, useRef, useState } from 'react'
import drawBoard from './game-rendering';
import { updateLine, updateSquares } from './update-line';

type GameProps = {
  gridSize: number;
  opponent: 'computer' | 'human';
  myPlayerId: number;
  onReset: () => void;
  onGoHome: () => void;
}

type LineArray<T = string | null> = T[][];

export type ChosenMove = ['h' | 'v', number, number];

export type GameState = Pick<GameProps, "gridSize" | "opponent"> & {
  hlines: LineArray;
  vlines: LineArray;
  squares: LineArray<number>;
  currentPlayer: number;
}


const SCREEN_SIZE = 600;
const SCORE_AREA_HEIGHT = 100;
const WINDOW_SIZE = SCREEN_SIZE + SCORE_AREA_HEIGHT;
const RED = "#ff0000";
const BLUE = "#0000ff";
const PLAYER_COLORS = [RED, BLUE];



function Game({ gridSize, opponent, onReset, onGoHome, myPlayerId }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [hlines, setHlines] = useState<GameState["hlines"]>(Array.from({ length: gridSize + 1 }, () => Array.from({ length: gridSize }, () => null)));
  const [vlines, setVlines] = useState<GameState["vlines"]>(Array.from({ length: gridSize }, () => Array.from({ length: gridSize + 1 }, () => null)));
  const [squares, setSquares] = useState<GameState["squares"]>(Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => 0)));
  const myMove = currentPlayer === myPlayerId;

  const getGameState = (): GameState => {
    const gameState: GameState = {
      opponent,
      hlines,
      vlines,
      squares,
      gridSize,
      currentPlayer,
    }
    return gameState;
  };

  const renderCanvas = () => {
    if (!canvasRef.current) return;
    console.log('rendering canvas');
    drawBoard(canvasRef.current, getGameState());
  };

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    console.log('HLINES HAVE CHANGED to', hlines)
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
    const opponentString = opponent === "computer" ? "Computer" : "Opponent";
    console.log({ opponentString, opponent, currentPlayer, myPlayerId })
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


  }, [hlines, vlines]);
  console.log({ canvasRef });



  function handleCanvasClick(event: { clientX: number; clientY: number; }) {
    const canvasEl = canvasRef.current;
    if (!canvasEl || !myMove) return;
    const rect = canvasEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const { squareCompleted, updatedGameState } = updateLine(x, y, getGameState());
    setHlines(updatedGameState.hlines);
    setVlines(updatedGameState.vlines);
    setSquares(updatedGameState.squares);
    if (!squareCompleted) {
      setCurrentPlayer((currentPlayer) => currentPlayer === 1 ? 2 : 1)
    }
    console.log({ squareCompleted })
  };

  useEffect(() => {
    if (myMove || opponent !== 'computer') return;
    // its time for a computer move!
    async function getComputerMove(): Promise<ChosenMove> {

      const data = {
        hlines,
        vlines,
        gridSize,
      };

      const { host } = window.location;
      const inDevMode = !host || host && ['127.0.0.1', 'localhost'].some(h => host.includes(h));
      const requestHost = inDevMode && true ? 'http://127.0.0.1:5000' : 'https://chiefsmurph.com/dotsandboxes';

      const response = await fetch(
        `${requestHost}/get-computer-move`,
        {
          method: 'POST',
          mode: 'cors', // no-cors, *cors, same-origin
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      ).then(r => r.json());

      return response.computer_move as ChosenMove;
    }
    (async function makeComputerMove() {
      console.log('ITS A COMPUTER MOVE')
      const chosenMove = await getComputerMove();
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
      const [lineType, lineI, lineJ] = chosenMove;
      console.log({ chosenMove})

      if (lineType === "h") {
        hlines[lineI][lineJ] = PLAYER_COLORS[currentPlayer - 1];
        setHlines([...hlines]);
        console.log('set h lines')
      } else if (lineType === "v") {
        vlines[lineI][lineJ] = PLAYER_COLORS[currentPlayer - 1];
        setVlines([...vlines]);
        console.log('set v lines')
      }
      const { squares, squareCompleted } = updateSquares([lineType, lineI, lineJ], getGameState());
      setSquares(squares);
      if (!squareCompleted) {
        setCurrentPlayer((currentPlayer) => currentPlayer === 1 ? 2 : 1)
      } else if (!isGameOver) {
        makeComputerMove();
      }
    })();

  }, [myMove]);

  return (
    <div id="game-section">
      <h2 id="game-status">{calcStatus}</h2>
      <canvas
        id="game-canvas"
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ cursor: myMove ? "pointer" : "default" }} />
      <div className="button-container">
        <button id="reset-game" onClick={() => onReset()}>Reset Game</button>
        <button id="go-home" onClick={() => onGoHome()}>Go Home</button>
      </div>
    </div>
  );
};

export default Game;