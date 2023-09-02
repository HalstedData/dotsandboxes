import { useCallback, useEffect } from 'react';
import { useRef, useState } from 'react'
import drawBoard from './draw-board';
import { makeMove, makeMoveFromXY, } from '../../commonts/make-move';
import getComputerMove from './get-computer-move';
import useGameStatus from './use-game-status';
import { GameInProgress, GameSocket } from './App';
import { GameState, Line } from '../../commonts/types';

export type GameProps = GameInProgress & {
  onReset: () => void;
  onGoHome: () => void;
  socket: GameSocket;
}

const SCREEN_SIZE = 600;
const SCORE_AREA_HEIGHT = 100;
const WINDOW_SIZE = SCREEN_SIZE + SCORE_AREA_HEIGHT;

function Game(gameProps: GameProps) {
  const { gridSize, playerStrings, onReset, onGoHome, myPlayerId, socket, gameId } = gameProps;
  console.log({ gameProps })
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    gridSize,
    hlines: Array.from({ length: gridSize + 1 }, () => Array.from({ length: gridSize }, () => null)),
    vlines: Array.from({ length: gridSize }, () => Array.from({ length: gridSize + 1 }, () => null)),
    squares: Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => null)),
    currentPlayer: playerStrings[0],
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
    const { gameStateUpdates, move } = makeMoveFromXY(x, y, gameState, gameProps.playerStrings);
    updateGameState(gameStateUpdates);
    gameId && socket.emit('send-move', move as Line, gameId);
  };

  const receiveMoveHandler = useCallback((move: Line, gameId: string) => {
    console.log('receiv', gameId, gameProps.gameId)
    if (gameId !== gameProps.gameId) {
      return;
    }
    console.log('receiving move cur player', gameState.currentPlayer);
    const { gameStateUpdates } = makeMove(move, gameState, gameProps.playerStrings);
    console.log('received move', move, gameStateUpdates);
    updateGameState(gameStateUpdates);
  }, [gameState]);

  useEffect(() => {
    async function makeComputerMove() {
      console.log('ITS A COMPUTER MOVE')
      const chosenMove = await getComputerMove(gameState);
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 2000));
      receiveMoveHandler(chosenMove, gameProps.gameId);
    }

    if (!gameState.isGameOver && gameState.currentPlayer === 'computer') {
      // its time for a computer move!
      makeComputerMove();
    };

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