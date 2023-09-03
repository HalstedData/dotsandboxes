import { useCallback, useEffect, useState } from 'react'
import './App.css'
import Game from './Game';
import { Socket, io } from "socket.io-client";
import { ClientToServerEvents, GameOnResponse, GameRequestResponse, GameV2, ServerToClientEvents, UserAuth, UserInfo } from '../../commonts/types';
import useGameStatus from './use-game-status';
import useAppStore from './store';
// import { GameOnResponse } from '@backend/types';

type Opponent = 'computer' | 'human';

export type GameInProgress = GameOnResponse & {
  opponent: Opponent;
  myPlayerId: string;
}

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function App() {
  console.log('appppp');
  const appStore = useAppStore();
  const { socket, gameKey, gameInProgress, socketStatus, userInfo, newGame, setSocketStatus, setUserInfo } = appStore;
  // const [socket, setSocket] = useState<GameSocket>(
  //   io(
  //     window.location.href.includes('localhost') ? "http://localhost:3003" : "http://38.108.119.159:3003/",
  //     { transports: ['websocket'], autoConnect: false }
  //   )
  // );
  // const [gameKey, setGameKey] = useState(0);
  // const [gameInProgress, setGameInProgress] = useState<GameInProgress | null>(null);
  // const [socketStatus, setSocketStatus] = useState('');
  // const [userInfo, setUserInfo] = useState<UserInfo | null>(null);


  const handleGameOnResponse = useCallback(({
    gameId,
    gridSize,
    playerStrings
  }: Exclude<GameRequestResponse, string>) => {
    // if (!userInfo) {
    //   debugger;
    //   return console.error('no userinfo');
    // }
    newGame({
      gameId,
      gridSize,
      playerStrings,
      opponent: 'human',
      myPlayerId: 'hahaha'
    });
    setSocketStatus('');
  }, [userInfo])

  const startGameHandler = () => {
    if (!userInfo) return;
    const {
      gridSize = Number((document.getElementById("grid-size") as HTMLSelectElement)?.value),
    } = gameInProgress || {};
    const opponent = (document.getElementById("opponent") as HTMLSelectElement)?.value as Opponent;
    if (opponent === 'computer') {
      newGame({
        gameId: '343',
        gridSize,
        playerStrings: ['you', 'computer'],
        opponent,
        myPlayerId: 'you'
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

  function connectSocket() {
    console.log('connectSocket')
    const userInfo = localStorage.getItem("dotsandboxesuserinfo"); // dots and boxes user auth
    if (userInfo) {
      const parsed = JSON.parse(userInfo) as UserInfo;
      const userAuth: UserAuth = {
        userID: parsed.userID,
        authToken: parsed.authToken
      };
      console.log('sending userAuth', userAuth)
      socket.auth = userAuth;
    }
    socket.connect();
  }

  useEffect(() => {
    socket.on('game-on', response => {
      console.log('game on', response);
      handleGameOnResponse(response);
    });
    socket.on('user-info', (userInfo) => {
      console.log(`setting user-info`, userInfo);
      setUserInfo(userInfo);
      localStorage.setItem("dotsandboxesuserinfo", JSON.stringify(userInfo));
    });
    socket.on('connect', () => console.log('CONNECTION'))
    connectSocket();
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
        gameInProgress && userInfo &&
        (
          <Game
            socket={socket}
            key={gameKey}
            onReset={startGameHandler}
            onGoHome={() => newGame(null)}
            gameInProgress={gameInProgress} userInfo={userInfo} />
        )}

    </>
  )
}

export default App
