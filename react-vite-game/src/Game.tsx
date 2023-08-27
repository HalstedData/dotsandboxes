import { useCallback, useEffect } from 'react';
import { useRef, useState } from 'react'
import drawBoard from './draw-board';
import { makeMove, makeMoveFromXY, } from './make-move';
import getComputerMove from './get-computer-move';
import useGameStatus from './use-game-status';
import { GameSocket } from './App';

export type GameProps = {
  gridSize: number;
  opponent: 'computer' | 'human';
  myPlayerId: number;
  onReset: () => void;
  onGoHome: () => void;
  socket: GameSocket;
}

type LineArray<T = string | null> = T[][];

export type Line = ['h' | 'v', number, number];

export type GameState = Pick<GameProps, "gridSize" | "opponent"> & {
  hlines: LineArray;
  vlines: LineArray;
  squares: LineArray<number>;
  currentPlayer: number;
  isGameOver: boolean;
}

const SCREEN_SIZE = 600;
const SCORE_AREA_HEIGHT = 100;
const WINDOW_SIZE = SCREEN_SIZE + SCORE_AREA_HEIGHT;

function Game(gameProps: GameProps) {
  const { gridSize, opponent, onReset, onGoHome, myPlayerId, socket } = gameProps;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    gridSize,
    opponent,
    hlines: Array.from({ length: gridSize + 1 }, () => Array.from({ length: gridSize }, () => null)),
    vlines: Array.from({ length: gridSize }, () => Array.from({ length: gridSize + 1 }, () => null)),
    squares: Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => 0)),
    currentPlayer: 1,
    isGameOver: false,
  });
  const myMove = gameState.currentPlayer === myPlayerId;

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    drawBoard(canvasEl, gameState, gameProps);
  }, [canvasRef, gameState]);

  const updateGameState = (gameStateUpdates: Partial<GameState>) => {
    if (!Object.values(gameStateUpdates).length) return;
    console.log('updaitng game state', gameStateUpdates)
    setGameState(currentGameState => ({
      ...currentGameState,
      ...gameStateUpdates
    }));
  }

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    canvasEl.width = WINDOW_SIZE - SCORE_AREA_HEIGHT;
    canvasEl.height = WINDOW_SIZE;

    // Set the canvas display size
    canvasEl.style.width = `${WINDOW_SIZE - SCORE_AREA_HEIGHT}px`;
    canvasEl.style.height = `${WINDOW_SIZE}px`;
    drawBoard(canvasEl, gameState, gameProps);
  }, [canvasRef]);

  const gameStatus = useGameStatus(gameState, gameProps);

  function handleCanvasClick(event: { clientX: number; clientY: number; }) {
    const canvasEl = canvasRef.current;
    if (!canvasEl || !myMove) return;
    const rect = canvasEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const { gameStateUpdates, move } = makeMoveFromXY(x, y, gameState);
    updateGameState(gameStateUpdates);
    socket.emit('send-move', move as Line);
  };

  const receiveMoveHandler = useCallback((move: Line) => {
    console.log('receiving move cur player', gameState.currentPlayer);
    debugger;
    const { gameStateUpdates } = makeMove(move, gameState);
    console.log('received move', move, gameStateUpdates);
    updateGameState(gameStateUpdates);
  }, [gameState]);

  useEffect(() => {
    if (gameState.isGameOver || myMove || opponent !== 'computer') return;
    // its time for a computer move!
    (async function makeComputerMove() {
      console.log('ITS A COMPUTER MOVE')
      const chosenMove = await getComputerMove(gameState);
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 2000));
      receiveMoveHandler(chosenMove);
    })();

  }, [gameState]);

  useEffect(() => {
    console.log('added receive move handler');
    socket.on('receive-move', receiveMoveHandler);
    return () => { socket.off('receive-move', receiveMoveHandler); }
  }, [receiveMoveHandler]);

  return (
    <div id="game-section">
      <h2 id="game-status">{gameStatus}</h2>
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