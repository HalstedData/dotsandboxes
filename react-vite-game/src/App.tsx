import { useEffect, useState } from 'react'
import './App.css'
import Game, { Line } from './Game';
import { Socket, io } from "socket.io-client";

type Opponent = 'computer' | 'human';
type GameInProgress = {
  gridSize: number;
  opponent: Opponent;
}

type GameOnResponse = {
  id: string;
  yourPlayerId: number;
  gridSize: number;
};

type GameRequestResponse = GameOnResponse | 'waiting';

type ClientToServerEvents = {
  "game-request": (gridSize: number, cb: (response: GameRequestResponse) => void) => void;
  "send-move": (move: Line) => void;
}
type ServerToClientEvents = {
  "game-on": (response: GameOnResponse) => void;
  "receive-move": (move: Line) => void;
}
export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;


function App() {
  const [socket] = useState<GameSocket>(io("http://localhost:3003", { transports: ['websocket'] }));
  const [gameKey, setGameKey] = useState(0);
  const [gameInProgress, setGameInProgress] = useState<GameInProgress | null>(null);
  const [socketStatus, setSocketStatus] = useState('');
  const [myPlayerId, setMyPlayerId] = useState<number>(1);


  const handleGameOnResponse = (response: Exclude<GameRequestResponse, string>) => {
    setMyPlayerId(response.yourPlayerId);
    setGameInProgress({
      gridSize: response.gridSize,
      opponent: 'human'
    });
    setSocketStatus('');
  }

  const startGameHandler = () => {
    setGameKey(gameKey + 1);
    const {
      gridSize = Number((document.getElementById("grid-size") as HTMLSelectElement)?.value),
      opponent = (document.getElementById("opponent") as HTMLSelectElement)?.value as Opponent
    } = gameInProgress || {};
    if (opponent === 'computer') {
      setMyPlayerId(1);
      setGameInProgress({
        gridSize,
        opponent
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
            myPlayerId={myPlayerId}
            onReset={startGameHandler}
            onGoHome={() => setGameInProgress(null)}
            {...gameInProgress} />
        )}

    </>
  )
}

export default App
