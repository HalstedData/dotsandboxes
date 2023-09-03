import { useCallback, useEffect, } from 'react';
import { useRef, useState } from 'react'
import drawBoard from './draw-board';
import { applyLine, getLineFromXY, } from '../../commonts/make-move';
import getComputerMove from './get-computer-move';
import useGameStatus from './use-game-status';
import { GameInProgress, GameSocket } from './App';
import { ClientGameV2, Line, UserInfo } from '../../commonts/types';

export type GameProps = {
  onReset: () => void;
  onGoHome: () => void;
  socket: GameSocket;
  gameInProgress: GameInProgress;
  userInfo: UserInfo;
}

const SCREEN_SIZE = 600;
const SCORE_AREA_HEIGHT = 100;
const WINDOW_SIZE = SCREEN_SIZE + SCORE_AREA_HEIGHT;

function Game(props: GameProps) {
  const { gameInProgress, socket, onReset, onGoHome, userInfo } = props;
  const { gridSize, playerStrings, gameId, opponent } = gameInProgress;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [width, setWidth] = useState(600);
  const [clientGame, setClientGame] = useState<ClientGameV2>({
    meta: {
      gridSize,
      playerStrings,
      gameId,
      width,
      moveOrder: [],
      opponent,
    },
    state: {
      hlines: Array.from({ length: gridSize + 1 }, () => Array.from({ length: gridSize }, () => null)),
      vlines: Array.from({ length: gridSize }, () => Array.from({ length: gridSize + 1 }, () => null)),
      squares: Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => null)),
      currentPlayer: playerStrings[0],
      isGameOver: false,
    },
  });

  const { meta, state } = clientGame;
  const isMoveMove = state.currentPlayer === userInfo.userID;

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    drawBoard(canvasEl, clientGame);
  }, [canvasRef, clientGame]);

  // const updateGameState = (gameStateUpdates: Partial<GameState>) => {
  //   if (!Object.values(gameStateUpdates).length) return;
  //   console.log('updaitng game state', gameStateUpdates)
  //   setClientGame(currentClientGame => ({
  //     meta: {
  //       ...current
  //     }
  //   }));
  // }

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    canvasEl.width = WINDOW_SIZE - SCORE_AREA_HEIGHT;
    canvasEl.height = WINDOW_SIZE;

    // Set the canvas display size
    canvasEl.style.width = `${WINDOW_SIZE - SCORE_AREA_HEIGHT}px`;
    canvasEl.style.height = `${WINDOW_SIZE}px`;
    drawBoard(canvasEl, clientGame);
  }, [canvasRef]);

  const gameStatus = useGameStatus(clientGame, userInfo);

  function handleCanvasClick(event: { clientX: number; clientY: number; }) {
    const canvasEl = canvasRef.current;
    if (!canvasEl || !isMoveMove) return;
    const rect = canvasEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const line = getLineFromXY(x, y, clientGame);
    if (!line) return;
    const nextClientGame = applyLine(line, clientGame);
    setClientGame(nextClientGame);
    console.log(`sending line for gameID ${gameId}`);
    gameId && socket.emit('send-line', line, gameId);
  };

  const receiveLineHandler = useCallback((line: Line, gameId: string) => {
    // console.log('receiv', gameId, meta.gameId)
    if (gameId !== meta.gameId) {
      return;
    }
    console.log('receiving move cur player', clientGame.state.currentPlayer);
    setClientGame(
      applyLine(line, clientGame)
    );
  }, [clientGame]);

  useEffect(() => {
    async function makeComputerMove() {
      console.log('ITS A COMPUTER MOVE')
      const chosenMove = await getComputerMove({
        ...state,
        gridSize: meta.gridSize
      });
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 2000));
      receiveLineHandler(chosenMove, meta.gameId);
    }

    console.log('computer????', state);

    if (!state.isGameOver && state.currentPlayer === 'computer') {
      // its time for a computer move!
      makeComputerMove();
    };

  }, [clientGame]);

  useEffect(() => {
    console.log('added receive move handler');
    socket.on('receive-line', receiveLineHandler);
    return () => { socket.off('receive-line', receiveLineHandler); }
  }, [receiveLineHandler]);

  return (
    <div id="game-section">
      <h2 id="game-status">{gameStatus}</h2>
      <canvas
        id="game-canvas"
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ cursor: isMoveMove ? "pointer" : "default" }} />
      <div className="button-container">
        <button id="reset-game" onClick={() => onReset()}>Reset Game</button>
        <button id="go-home" onClick={() => onGoHome()}>Go Home</button>
      </div>
    </div>
  );
};

export default Game;