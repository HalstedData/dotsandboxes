import fs from 'fs';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4, validate } from 'uuid';
import { applyLine } from '../commonts/make-move';
import { ClientToServerEvents, GameOnResponse, GameRequestResponse, GameV2, Line, ServerToClientEvents, UserAuth, UserInfo } from '../commonts/types';
import { createNewUser, validateUserAuth } from './users';


const waitingRooms: Map<number, string[]> = new Map();

const gamesInProgress: Record<GameV2["meta"]["gameId"], GameV2> = {};
type NewGameParams = Pick<GameV2["meta"], 'gridSize' | 'playerStrings'>;

const newGame = (params: NewGameParams) => {
  const { gridSize, playerStrings } = params;
  const id = uuidv4();
  const gameV2: GameV2 = {
    meta: {
      gameId: id,
      gridSize,
      playerStrings,
      moveOrder: [],
    },
    state: {
      hlines: Array.from({ length: gridSize + 1 }, () => Array.from({ length: gridSize }, () => null)),
      vlines: Array.from({ length: gridSize }, () => Array.from({ length: gridSize + 1 }, () => null)),
      squares: Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => null)),
      currentPlayer: playerStrings[0],
      isGameOver: false,
    }
  };
  gamesInProgress[id] = gameV2;
  return id;
};

const io = new Server<ClientToServerEvents, ServerToClientEvents, any, UserInfo>({
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



const userIDsToSockets: Record<string, Socket["id"][]> = {};



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

  socket.on('game-request', (gridSize, cb) => {
    const { userID } = socket.data;
    const waiting = (waitingRooms.get(gridSize) || [])
      .filter(userWaiting => userWaiting !== userID);
    const playerToMatch = waiting.shift();
    const matchingSocketIds = playerToMatch ? userIDsToSockets[playerToMatch] : [];
    const matchingSockets = matchingSocketIds
      .map(socketId => io.sockets.sockets.get(socketId));

    if (!playerToMatch || !matchingSockets.length) {
      waitingRooms.set(gridSize, [...waiting, userID]);
      console.log({ waiting, matchingSocketIds, playerToMatch });
      return cb('waiting');
    }
    const playerStrings = [playerToMatch, userID];
    const newGameId = newGame({
      gridSize,
      playerStrings,
    });
    matchingSockets.forEach(playerSocket => {
      // console.log({ playerSocket });
      playerSocket?.emit('game-on', ({
        gameId: newGameId,
        // yourPlayerId: playerToMatch,
        gridSize,
        playerStrings,
      }));
    });
    cb({
      gameId: newGameId,
      // yourPlayerId: socket.id,
      gridSize,
      playerStrings,
    });


  });
  socket.on('send-line', (move, gameId) => {
    const { userID } = socket.data;
    // amount of times called 50x / 1 min ?
    // more than once in a half a second

    const gameInProgress = gamesInProgress[gameId];

    if (!gameInProgress) {
      return console.error("Invalid gameId.  Game not found.");
    }
    const nextGame = applyLine(move, gameInProgress);
    const { gridSize, playerStrings } = gameInProgress.meta;

    if (nextGame.state.isGameOver) {
      console.log('GAME OVER');
      fs.writeFileSync(`./game-${gameId}.json`, JSON.stringify(nextGame, null, 2));

      const startNewGameWithSameSettings = () => {
        delete gamesInProgress[gameId];
        const newGameId = newGame({
          gridSize,
          playerStrings,
        });
        const matchingSockets = playerStrings
          .map(playerUserID =>
            userIDsToSockets[playerUserID].map(socketId => io.sockets.sockets.get(socketId)))
          .flat();

        matchingSockets.forEach(playerSocket =>
          playerSocket?.emit('game-on', {
            gameId: newGameId,
            gridSize,
            playerStrings,
          }));

      };

      setTimeout(startNewGameWithSameSettings, 4000);


    }

    // validate this is their turn

    // update the gameState on the server

    // check if it's the end of the game
    // winner of the game has to win on their own turn
    // save the gamestate to json
    // update user json to say games played .... game.id

    // validate if it's a valid move
    // if the move is already taken

    // if it is valid then send it to all the other players in the room
    const matchingSockets = playerStrings
      .filter(playerUserId => playerUserId !== userID)
      .map(playerUserID =>
        userIDsToSockets[playerUserID].map(socketId => io.sockets.sockets.get(socketId)))
      .flat();
    matchingSockets.forEach(playerSocket => playerSocket?.emit('receive-line', move, gameId));

  });
});

io.listen(3003);
