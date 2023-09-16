import { useCallback, useEffect, } from 'react';
import { useRef, useState } from 'react'
import drawBoard from './draw-board';
import { applyLine, getLineFromXY, } from '../../commonts/make-move';
import useGameStatus from './use-game-status';
import { GameInProgress, GameSocket } from './App';
import { ClientGameV2, Line, UserInfo } from '../../commonts/types';
import { useWindowSize } from 'react-use';
import Confetti from 'react-confetti';
import { Textfit } from 'react-textfit';

export type GameProps = {
  onReset: () => void;
  onGoHome: () => void;
  socket: GameSocket;
  gameInProgress: GameInProgress;
  userInfo: UserInfo;
}

const SCORE_AREA_HEIGHT = 100;

function Game(props: GameProps) {
  const { width, height } = useWindowSize()
  const { gameInProgress, socket, onReset, onGoHome, userInfo } = props;
  const { gridSize, players, gameID } = gameInProgress;
  // const [showingConfetti, setShowingConfetti] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [clientGame, setClientGame] = useState<ClientGameV2>({
    meta: {
      gridSize,
      players,
      gameID,
      width: Math.min(600, width),
      moveOrder: [],
      myPlayerId: userInfo.userID,
    },
    state: {
      hlines: Array.from({ length: gridSize + 1 }, () => Array.from({ length: gridSize }, () => null)),
      vlines: Array.from({ length: gridSize }, () => Array.from({ length: gridSize + 1 }, () => null)),
      squares: Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => null)),
      currentPlayer: players[0].userID,
      isGameOver: false,
    },
  });

  const { meta, state } = clientGame;
  const showingConfetti = meta.winnerUserID === meta.myPlayerId;
  const isMoveMove = state.currentPlayer === meta.myPlayerId;

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    drawBoard(canvasEl, clientGame);
  }, [canvasRef, clientGame]);

  const sizeCanvas = () => {
    console.log('sizing canvas')
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvasWidth = Math.min(600, width - 40);
    canvasEl.width = canvasWidth;
    canvasEl.height = canvasWidth + SCORE_AREA_HEIGHT;

    // Set the canvas display size
    // canvasEl.style.width = `${canvasWidth}px`;
    // canvasEl.style.height = `${canvasWidth + SCORE_AREA_HEIGHT}px`;
    setClientGame({
      meta: {
        ...clientGame.meta,
        width: canvasWidth,
      },
      state: clientGame.state
    });
  };

  useEffect(sizeCanvas, [width]);

  const gameStatus = useGameStatus(clientGame);

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
    console.log(`sending line for gameID ${gameID}`);
    gameID && socket.emit('send-line', line, gameID);
  };

  const receiveLineHandler = useCallback((line: Line, gameID: string) => {
    // console.log('receiv', gameID, meta.gameID)
    if (gameID !== meta.gameID) {
      return;
    }
    console.log('receiving move cur player', clientGame.state.currentPlayer);
    setClientGame(
      applyLine(line, clientGame)
    );
  }, [clientGame]);

  // useEffect(() => {
  //   async function makeComputerMove() {
  //     console.log('ITS A COMPUTER MOVE')
  //     const chosenMove = await getComputerMove({
  //       ...state,
  //       gridSize: meta.gridSize
  //     });
  //     await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 2000));
  //     receiveLineHandler(chosenMove, meta.gameID);
  //   }

  //   console.log('computer????', state);

  //   if (!state.isGameOver && state.currentPlayer === 'computer') {
  //     // its time for a computer move!
  //     makeComputerMove();
  //   };

  // }, [clientGame]);

  useEffect(() => {
    console.log('added receive move handler');
    socket.on('receive-line', receiveLineHandler);
    return () => { socket.off('receive-line', receiveLineHandler); }
  }, [receiveLineHandler]);

  useEffect(() => {
    return () => {
      console.log('player dropped');
      socket.emit('player-dropped', gameID);
    };
  }, []);

  return (
    <div id="game-section">
      <Textfit
        mode="single"
        max={30}
        forceSingleModeWidth={true}
      >
        {gameStatus}
      </Textfit>
      <canvas
        id="game-canvas"
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ cursor: isMoveMove ? "pointer" : "default" }} />
      <div className="button-container">
        {/* <button id="reset-game" onClick={() => onReset()}>Reset Game</button> */}
        <button id="go-home" onClick={() => onGoHome()}>Go Home</button>
      </div>
      {
        showingConfetti && (
          <Confetti
            width={width}
            height={height}
            gravity={0.5}
          />
        )
      }
    </div>
  );
};

export default Game;