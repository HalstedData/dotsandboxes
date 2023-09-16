import { Server, Socket } from 'socket.io';
import { applyLine } from '../commonts/make-move';
import { ClientToServerEvents, ServerToClientEvents, UserAuth, UserInfo } from '../commonts/types';
import { createNewUser, emitToUsers, getUserByID, userIDsToSockets, validateUserAuth } from './users';
import { gamesInProgress, handleGameOver, newGame, playerHasDisconnected, receiveLineFromUserID } from './game';
import { getLeaderboard, updateLeaderboard } from './leaderboard';
import uniq from 'lodash/uniq';

const waitingRooms: Map<number, {
  userID: string;
  socketID: string;
}[]> = new Map();

export const io = new Server<ClientToServerEvents, ServerToClientEvents, any, UserInfo>({
  cors: {
    origin: ["http://localhost:5173", 'https://react-vite-game-v2--dotsandboxes.repl.co', 'http://38.108.119.159:5173'],
    methods: ["GET", "POST"]
  }
});

io.use(async (socket, next) => {
  // const { userID = uuidv4(), authToken = uuidv4() } = socket.handshake.auth;
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
  'insensitivecovering',
];

async function cueComputerGameForWaitingPlayer(gridSize: number) {
  const waiting = waitingRooms.get(gridSize) || [];
  const waitingSocketIDs = waiting.map(userWaiting => userWaiting.socketID);
  const waitingSockets = waitingSocketIDs
    .map(socketId => io.sockets.sockets.get(socketId));
  const waitingUserIDs = uniq(waiting.map(userWaiting => userWaiting.userID));

  const playerUserIDs = [
    ...waitingUserIDs,
    COMPUTER_PLAYER_USER_IDS[0]
  ];

  const playerUserInfos = (await Promise.all(
    playerUserIDs.map(async userID => await getUserByID(userID))
  )).filter((player): player is UserInfo => !!player);
  const players = playerUserInfos.map(userInfo => ({
    userID: userInfo.userID,
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
      const allUserIDsWaiting = uniq(waiting.map(userWaiting => userWaiting.userID));
      const PLAYERS_PER_GAME = 2;
      const playersNeededRemaning = PLAYERS_PER_GAME - allUserIDsWaiting.length;
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
//   userID: 'pinkmonkey23'
// })

io.on('connection', socket => {
  console.log('new connection', socket.data);
  const emitUserInfo = () => {
    const userInfo = socket.data;
    userIDsToSockets[userInfo.userID] = [
      ...(userIDsToSockets[userInfo.userID] || [])
        .filter(compareSocket => compareSocket !== socket.id),
      socket.id,
    ];
    socket.emit('user-info', userInfo);
  };
  emitUserInfo();
  socket.emit('leaderboard', getLeaderboard());

  socket.on('game-request', async (gridSize, cb) => {
    const { userID } = socket.data;
    const waiting = waitingRooms.get(gridSize) || [];
    const otherUserIDsWaiting = uniq(waiting.map(userWaiting => userWaiting.userID));
    const PLAYERS_PER_GAME = 2;
    // console.log({ otherUserIDsWaiting });
    if (otherUserIDsWaiting.length + 1 < PLAYERS_PER_GAME) {
      waitingRooms.set(gridSize, [...waiting, {
        userID,
        socketID: socket.id
      }]);
      console.log({ waiting, otherUserIDsWaiting });
      scheduleCheckForWaiting(gridSize);
      return cb('waiting');
    }
    const waitingSocketIDs = waiting.map(userWaiting => userWaiting.socketID);
    const waitingSockets = waitingSocketIDs
      .map(socketId => io.sockets.sockets.get(socketId))
      .filter((s): s is typeof socket => !!s);

    const playersUserIDs = [...otherUserIDsWaiting, userID];
    const playerUserInfos = (await Promise.all(
      playersUserIDs.map(async userID => await getUserByID(userID))
    )).filter((player): player is UserInfo => !!player);
    const players = playerUserInfos.map(userInfo => ({
      userID: userInfo.userID,
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
    const { userID } = socket.data;
    receiveLineFromUserID(line, userID, gameID);
  });
  socket.on('player-dropped', (gameID) => {
    const { userID } = socket.data;
    playerHasDisconnected(userID, gameID);
  });
  socket.on('disconnect', () => {
    const { userID } = socket.data;
    playerHasDisconnected(userID);
    const newUserIDSockets = userIDsToSockets[userID].filter(socketID => socketID !== socket.id);
    if (!newUserIDSockets.length) {
      delete userIDsToSockets[userID];
    } else {
      userIDsToSockets[userID] = newUserIDSockets;
    }
    // remove this userID from all the waitingRooms
    const array = Array.from(waitingRooms, ([name, waiting]) => ({ name, waiting }));
    array.forEach(({ name, waiting }) => {
      waitingRooms.set(name, waiting.filter(waitingUser => waitingUser.userID !== userID));
    });
  });
});

io.listen(3003);

updateLeaderboard();