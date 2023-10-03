import { Server, Socket } from 'socket.io';
import { applyLine } from '../commonts/make-move';
import { ClientToServerEvents, ServerToClientEvents, UserAuth, UserInfo } from '../commonts/types';
import { createNewUser, emitToUsers, getUserByID, usernamesToSockets, validateUserAuth } from './users';
import { gamesInProgress, handleGameOver, newGame, playerHasDisconnected, receiveLineFromUsername } from './game';
import { getLeaderboard, updateLeaderboard } from './leaderboard';
import uniq from 'lodash/uniq';

const waitingRooms: Map<number, {
  username: string;
  socketID: string;
}[]> = new Map();

export const io = new Server<ClientToServerEvents, ServerToClientEvents, any, UserInfo>({
  cors: {
    origin: ["http://localhost:5173", 'https://react-vite-game-v2--dotsandboxes.repl.co', 'http://38.108.119.159:5173'],
    methods: ["GET", "POST"]
  }
});

io.use(async (socket, next) => {
  // const { username = uuidv4(), authToken = uuidv4() } = socket.handshake.auth;
  const userAuth = socket.handshake.auth as UserAuth;
  let userInfo = await validateUserAuth(userAuth);
  if (!userInfo) {
    console.log('userinfo not found');
    userInfo = await createNewUser();
    console.log(userInfo, 'userinfo created');
  }
  Object.assign(socket.data, userInfo);
  next();
});

const checkTimeouts: Map<number, NodeJS.Timeout | null> = new Map();



export const COMPUTER_PLAYER_USER_IDS = [
  'pinkmonkey23',
  'rubydog31',
];

async function cueComputerGameForWaitingPlayer(gridSize: number) {
  const waiting = waitingRooms.get(gridSize) || [];
  const waitingSocketIDs = waiting.map(userWaiting => userWaiting.socketID);
  const waitingSockets = waitingSocketIDs
    .map(socketId => io.sockets.sockets.get(socketId));
  const waitingUsernames = uniq(waiting.map(userWaiting => userWaiting.username));

  const playerUsernames = [
    ...waitingUsernames,
    COMPUTER_PLAYER_USER_IDS[Math.round(Math.random())]
  ];

  const playerUserInfos = (await Promise.all(
    playerUsernames.map(getUserByID)
  )).filter((player): player is UserInfo => !!player);
  // console.log({playerUserInfos})
  const players = playerUserInfos.map(userInfo => ({
    username: userInfo.username,
    score: userInfo.score,
  }));

  // clear the waiting room for this gridSize
  waitingRooms.set(gridSize, []);

  // create and start the game
  const newGameID = newGame({
    gridSize,
    players,
  });
  gamesInProgress[newGameID].meta.isComputerGame = true;
  waitingSockets.forEach(playerSocket => {
    // console.log({ playerSocket });
    playerSocket?.emit('game-on', ({
      gameID: newGameID,
      // yourPlayerId: playerToMatch,
      gridSize,
      players,
    }));
  });

}


function scheduleCheckForWaiting(gridSize: number) {
  const SECONDS_TO_WAIT = 5;
  const curTimeout = checkTimeouts.get(gridSize);
  curTimeout && clearTimeout(curTimeout);
  checkTimeouts.set(
    gridSize,
    setTimeout(() => {
      const waiting = waitingRooms.get(gridSize) || [];
      const allUsernamesWaiting = uniq(waiting.map(userWaiting => userWaiting.username));
      const PLAYERS_PER_GAME = 2;
      const playersNeededRemaning = PLAYERS_PER_GAME - allUsernamesWaiting.length;
      if (playersNeededRemaning) {
        // cue computer
        console.log(`we need ${playersNeededRemaning} computers here`);
        cueComputerGameForWaitingPlayer(gridSize);
      } else {
        console.log('no computer needed here', gridSize);
      }
    }, SECONDS_TO_WAIT * 1000)
  );
}

// createNewUser({
//   username: 'pinkmonkey23'
// })

io.on('connection', socket => {
  console.log('new connection', socket.data);
  const emitUserInfo = () => {
    const userInfo = socket.data;
    usernamesToSockets[userInfo.username] = [
      ...(usernamesToSockets[userInfo.username] || [])
        .filter(compareSocket => compareSocket !== socket.id),
      socket.id,
    ];
    socket.emit('user-info', userInfo);
  };
  emitUserInfo();
  socket.emit('leaderboard', getLeaderboard());

  socket.on('game-request', async (gridSize, cb) => {
    const { username } = socket.data;
    const waiting = waitingRooms.get(gridSize) || [];
    const otherUsernamesWaiting = uniq(waiting.map(userWaiting => userWaiting.username));
    const PLAYERS_PER_GAME = 2;
    // console.log({ otherUsernamesWaiting });
    if (otherUsernamesWaiting.length + 1 < PLAYERS_PER_GAME) {
      waitingRooms.set(gridSize, [...waiting, {
        username,
        socketID: socket.id
      }]);
      console.log({ waiting, otherUsernamesWaiting });
      scheduleCheckForWaiting(gridSize);
      return cb('waiting');
    }
    const waitingSocketIDs = waiting.map(userWaiting => userWaiting.socketID);
    const waitingSockets = waitingSocketIDs
      .map(socketId => io.sockets.sockets.get(socketId))
      .filter((s): s is typeof socket => !!s);

    const playersUsernames = [...otherUsernamesWaiting, username];
    const playerUserInfos = (await Promise.all(
      playersUsernames.map(async username => await getUserByID(username))
    )).filter((player): player is UserInfo => !!player);
    const players = playerUserInfos.map(userInfo => ({
      username: userInfo.username,
      score: userInfo.score,
    }));

    // clear any computer check timeouts for this gridSize
    const curTimeout = checkTimeouts.get(gridSize);
    curTimeout && clearTimeout(curTimeout);
    checkTimeouts.set(gridSize, null);

    // clear the waiting room for this gridSize
    waitingRooms.set(gridSize, []);

    // create and start the game
    const newGameID = newGame({
      gridSize,
      players,
    });
    waitingSockets.forEach(playerSocket => {
      // console.log({ playerSocket });
      playerSocket?.emit('game-on', ({
        gameID: newGameID,
        // yourPlayerId: playerToMatch,
        gridSize,
        players,
      }));
    });
    cb({
      gameID: newGameID,
      // yourPlayerId: socket.id,
      gridSize,
      players,
    });


  });
  socket.on('send-line', (line, gameID) => {
    const { username } = socket.data;
    receiveLineFromUsername(line, username, gameID);
  });
  socket.on('player-dropped', (gameID) => {
    const { username } = socket.data;
    playerHasDisconnected(username, gameID);
  });
  socket.on('disconnect', () => {
    const { username } = socket.data;
    playerHasDisconnected(username);
    const newUsernameSockets = usernamesToSockets[username].filter(socketID => socketID !== socket.id);
    if (!newUsernameSockets.length) {
      delete usernamesToSockets[username];
    } else {
      usernamesToSockets[username] = newUsernameSockets;
    }
    // remove this username from all the waitingRooms
    const array = Array.from(waitingRooms, ([name, waiting]) => ({ name, waiting }));
    array.forEach(({ name, waiting }) => {
      waitingRooms.set(name, waiting.filter(waitingUser => waitingUser.username !== username));
    });
  });
});

io.listen(3003);

updateLeaderboard();