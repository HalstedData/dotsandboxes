import { useEffect, useState } from 'react'
import './App.css'
import Game, { Line } from './Game';
import { Socket, io } from "socket.io-client";

type Opponent = 'computer' | 'human';
export type GameInProgress = Omit<GameOnResponse, 'yourPlayerId'> & {
  myPlayerId: string;
}

type GameOnResponse = {
  gameId: string;
  yourPlayerId: string;
  gridSize: number;
  playerStrings: string[];
};

type GameRequestResponse = GameOnResponse | 'waiting';

type ClientToServerEvents = {
  "game-request": (gridSize: number, cb: (response: GameRequestResponse) => void) => void;
  "send-move": (move: Line, gameId: string) => void;
}
type ServerToClientEvents = {
  "game-on": (response: GameOnResponse) => void;
  "receive-move": (move: Line, gameId: string) => void;
}
export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const socket: GameSocket = io(
  window.location.href.includes('localhost') ? "http://localhost:3003" : "http://38.108.119.159:3003/",
  { transports: ['websocket'] }
);

function App() {
  const [gameKey, setGameKey] = useState(0);
  const [gameInProgress, setGameInProgress] = useState<GameInProgress | null>(null);
  const [socketStatus, setSocketStatus] = useState('');


  const handleGameOnResponse = ({
    gameId,
    yourPlayerId,
    gridSize,
    playerStrings
  }: Exclude<GameRequestResponse, string>) => {
    console.log({

      gameId,
      yourPlayerId,
      gridSize,
      playerStrings
    }, 'handling')
    setGameInProgress({
      gameId,
      gridSize,
      playerStrings,
      myPlayerId: yourPlayerId,
    });
    setSocketStatus('');
    setGameKey(gameKey => gameKey + 1);
  }

  const startGameHandler = () => {
    setGameKey(gameKey => gameKey + 1);
    const {
      gridSize = Number((document.getElementById("grid-size") as HTMLSelectElement)?.value),
    } = gameInProgress || {};
    const opponent = (document.getElementById("opponent") as HTMLSelectElement)?.value as Opponent;
    if (opponent === 'computer') {
      setGameInProgress({
        gameId: '343',
        myPlayerId: 'you',
        gridSize,
        playerStrings: ['you', 'computer']
      });
    } else {
      socket.emit('game-request', gridSize, response => {
        console.log('game request response', response);
        if (response === 'waiting') {
          setSocketStatus('waiting');
        } else {
          handleGameOnResponse(response);
        }
      });
    }
  };

  useEffect(() => {
    socket.on('game-on', response => {
      console.log('game on', response);
      handleGameOnResponse(response);
    });
  }, []);

  return (
    <>
      <h1 id="game-title">Dots and Boxes</h1>
      {
        !gameInProgress && !socketStatus && (
          <div id="options">
            <label htmlFor="grid-size">Grid Size:</label>
            <select id="grid-size">
              <option value="3">3x3</option>
              <option value="4">4x4</option>
              <option value="5">5x5</option>
            </select><br />
            <label htmlFor="opponent">Opponent:</label>
            <select id="opponent">
              <option value="computer">Computer</option>
              <option value="human">Human</option>
            </select><br />
            <button id="start-button" onClick={startGameHandler}>Start Game</button>
          </div>
        )
      }
      {
        socketStatus && <h3>{socketStatus}...</h3>
      }
      {
        gameInProgress &&
        (
          <Game
            socket={socket}
            key={gameKey}
            onReset={startGameHandler}
            onGoHome={() => setGameInProgress(null)}
            {...gameInProgress} />
        )}

    </>
  )
}

export default App
