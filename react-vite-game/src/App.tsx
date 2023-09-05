import { PropsWithChildren, useEffect } from 'react'
import './App.css'
import Game from './Game';
import { Socket } from "socket.io-client";
import { ClientGameV2, ClientToServerEvents, GameRequestResponse, ServerToClientEvents, UserAuth, UserInfo } from '../../commonts/types';
import useAppStore from './store';
import Leaderboard from './Leaderboard';

export type GameInProgress = Pick<ClientGameV2['meta'], 'gameID' | 'gridSize' | 'players'>;

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
let renderCount = 0;


const Panel = ({ children }: PropsWithChildren) => <div className="panel">{children}</div>;


function App() {
  console.log('appppp');
  const { socket, gameKey, gameInProgress, socketStatus, userInfo, newGame, setSocketStatus, setUserInfo, leaderboard, setLeaderboard } = useAppStore();
  renderCount++;
  console.log('RENDER', userInfo, gameKey, socketStatus, renderCount);
  const handleGameOnResponse = ({
    gameID,
    gridSize,
    players
  }: Exclude<GameRequestResponse, string>) => {
    newGame({
      gameID,
      gridSize,
      players,
    });
    setSocketStatus('');
  };

  const startGameHandler = () => {
    if (!userInfo) return;
    const {
      gridSize = Number((document.getElementById("grid-size") as HTMLSelectElement)?.value),
    } = gameInProgress || {};
    // const opponent = (document.getElementById("opponent") as HTMLSelectElement)?.value as Opponent;
    // if (opponent === 'computer') {
    //   newGame({
    //     gameID: '343',
    //     gridSize,
    //     players: [{'you', 'computer'],
    //     opponent,
    //   });
    // } else {
    socket.emit('game-request', gridSize, response => {
      console.log('game request response', response);
      if (response === 'waiting') {
        setSocketStatus('waiting');
      } else {
        handleGameOnResponse(response);
      }
    });
    // }
  };

  const connectSocket = () => {
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
  };

  useEffect(() => {
    socket.on('game-on', handleGameOnResponse);

    socket.on('leaderboard', (leaderboard) => {
      console.log(`setting leaderboard`, leaderboard);
      setLeaderboard(leaderboard);
    });
    socket.on('user-info', (userInfo) => {
      console.log(`setting user-info`, userInfo);
      setUserInfo(userInfo);
      localStorage.setItem("dotsandboxesuserinfo", JSON.stringify(userInfo));
    });
    socket.on('player-disconnected', () => {
      alert('player has disconnected');
      newGame(null);
    });
    socket.on('connect', () => console.log('CONNECTION'))
    connectSocket();
    return () => {
      socket.removeAllListeners();
    };
  }, []);

  return (
    <>
      <h1 id="game-title">Dots and Boxes</h1>

      <Panel>
        {
          !gameInProgress && !socketStatus && (
            <div id="options">
              <label htmlFor="grid-size">Grid Size:</label>
              <select id="grid-size">
                <option value="3">3x3</option>
                <option value="4">4x4</option>
                <option value="5">5x5</option>
              </select>
              {/* <label htmlFor="opponent">Opponent:</label>
            <select id="opponent">
              <option value="computer">Computer</option>
              <option value="human">Human</option>
            </select><br /> */}
              <button id="start-button" onClick={startGameHandler}>Start Game</button>
            </div>
          )
        }
        {
          socketStatus && <h3>{socketStatus}...</h3>
        }
      </Panel>
      {
        !gameInProgress && (
          <Leaderboard leaderboard={leaderboard} userInfo={userInfo} />
        )
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
        )
      }
      {userInfo && <UserInfoPanel {...userInfo} />}

    </>
  )
}

function UserInfoPanel({ userID, score }: UserInfo) {
  return (
    <div>
      <pre>
        your userID: {userID}<br />
        your score: {score}
      </pre>
    </div>
  )
}

export default App
