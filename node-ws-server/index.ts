import { Server } from 'socket.io';
import { applyLine } from '../commonts/make-move';
import { ClientToServerEvents, ServerToClientEvents, UserAuth, UserInfo } from '../commonts/types';
import { createNewUser, emitToUsers, getUserByID, userIDsToSockets, validateUserAuth } from './users';
import { gamesInProgress, handleGameOver, newGame, playerHasDisconnected } from './game';
import { getLeaderboard, updateLeaderboard } from './leaderboard';


const waitingRooms: Map<number, string[]> = new Map();

export const io = new Server<ClientToServerEvents, ServerToClientEvents, any, UserInfo>({
  cors: {
    origin: "http://localhost:5173",
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
    const waiting = (waitingRooms.get(gridSize) || [])
      .filter(userWaiting => userWaiting !== userID);
    const playerToMatch = waiting.shift();
    console.log({ playerToMatch })
    const matchingSocketIds = playerToMatch ? userIDsToSockets[playerToMatch] ?? [] : [];
    const matchingSockets = matchingSocketIds
      .map(socketId => io.sockets.sockets.get(socketId))
      .filter(Boolean);

    if (!playerToMatch || !matchingSockets.length) {
      waitingRooms.set(gridSize, [...waiting, userID]);
      console.log({ waiting, matchingSocketIds, playerToMatch });
      return cb('waiting');
    }
    const playersUserIDs = [playerToMatch, userID];
    const playerUserInfos = (await Promise.all(
      playersUserIDs.map(async userID => await getUserByID(userID))
    )).filter((player): player is UserInfo => !!player);
    const players = playerUserInfos.map(userInfo => ({
      userID: userInfo.userID,
      score: userInfo.score,
    }));
    const newGameID = newGame({
      gridSize,
      players,
    });
    matchingSockets.forEach(playerSocket => {
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
  socket.on('send-line', (move, gameID) => {
    const { userID } = socket.data;
    // amount of times called 50x / 1 min ?
    // more than once in a half a second

    const gameInProgress = gamesInProgress[gameID];

    if (!gameInProgress) {
      return console.error("Invalid gameID.  Game not found.");
    }


    // validate this is their turn

    if (gameInProgress.state.currentPlayer !== userID) {
      return console.error(`This person tried to make a move when it wasn't their turn: ${userID}`);
    }


    const nextGame = applyLine(move, gameInProgress);
    gamesInProgress[gameID] = nextGame;

    const { players } = nextGame.meta;
    const { isGameOver } = nextGame.state;

    if (isGameOver) {
      console.log('GAME OVER');
      handleGameOver(gameID);
    }


    // update the gameState on the server

    // check if it's the end of the game
    // winner of the game has to win on their own turn
    // save the gamestate to json
    // update user json to say games played .... game.id

    // validate if it's a valid move
    // if the move is already taken

    // if it is valid then send it to all the other players in the room

    emitToUsers(
      players
        .map(player => player.userID)
        .filter(playerUserId => playerUserId !== userID),
      'receive-line', move, gameID
    );
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
  });
});

io.listen(3003);

updateLeaderboard();