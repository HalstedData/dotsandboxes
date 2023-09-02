import fs from 'fs';
import { Server } from 'socket.io';
import { v4 as uuidv4, validate } from 'uuid';
import { makeMove } from '../commonts/make-move';
import { ClientToServerEvents, GameOnResponse, GameRequestResponse, GameState, Line, ServerToClientEvents, UserAuth, UserInfo } from '../commonts/types';
import { createNewUser, validateUserAuth } from './users';


const waitingRooms: Map<number, string[]> = new Map();

type ServerGameState = GameState & Pick<GameOnResponse, 'playerStrings'>;

const gamesInProgress: Record<string, ServerGameState> = {};

type NewGameParams = Pick<ServerGameState, 'gridSize' | 'playerStrings'>;

const newGame = (params: NewGameParams) => {
  const { gridSize, playerStrings } = params;
  const id = uuidv4();
  gamesInProgress[id] = {
    gridSize,
    hlines: Array.from({ length: gridSize + 1 }, () => Array.from({ length: gridSize }, () => null)),
    vlines: Array.from({ length: gridSize }, () => Array.from({ length: gridSize + 1 }, () => null)),
    squares: Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => null)),
    currentPlayer: playerStrings[0],
    isGameOver: false,
    playerStrings,
  };
  return id;
};

const io = new Server<ClientToServerEvents, ServerToClientEvents, any, UserInfo & UserAuth>({
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
  const userAuth: UserAuth = {
    userID: socket.data.userID,
    authToken: socket.data.authToken
  };
  console.log(userAuth);
  socket.emit('user-auth', userAuth);
  socket.on('game-request', (gridSize, cb) => {

    const waiting = waitingRooms.get(gridSize) || [];
    const playerToMatch = waiting.shift();
    const playerToMatchSocket = playerToMatch && io.sockets.sockets.get(playerToMatch);
    if (!playerToMatch || !playerToMatchSocket) {
      waitingRooms.set(gridSize, [...waiting, socket.id]);
      return cb('waiting');
    }
    const playerStrings = [playerToMatch, socket.id];
    const newGameId = newGame({
      gridSize,
      playerStrings,
    });
    playerToMatchSocket.emit('game-on', ({
      gameId: newGameId,
      yourPlayerId: playerToMatch,
      gridSize,
      playerStrings,
    }));
    cb({
      gameId: newGameId,
      yourPlayerId: socket.id,
      gridSize,
      playerStrings,
    });


  });
  socket.on('send-move', (move, gameId) => {
    // amount of times called 50x / 1 min ?
    // more than once in a half a second

    const gameInProgress = gamesInProgress[gameId];

    if (!gameInProgress) {
      return console.error("Invalid gameId.  Game not found.");
    }
    const { gameStateUpdates } = makeMove(move, gameInProgress, gameInProgress.playerStrings);
    if (!Object.values(gameStateUpdates).length) {
      return console.error("Invalid move.  I don't think that was a legit move.");
    }
    const nextGameState: ServerGameState = {
      ...gamesInProgress[gameId],
      ...gameStateUpdates,
    };
    gamesInProgress[gameId] = nextGameState;

    const { gridSize, playerStrings } = gameInProgress;

    if (nextGameState.isGameOver) {
      console.log('GAME OVER');
      fs.writeFileSync(`./game-${gameId}.json`, JSON.stringify(nextGameState, null, 2));
      function startNewGameWithSameSettings() {
        delete gamesInProgress[gameId];
        const newGameId = newGame({
          gridSize,
          playerStrings,
        });
        playerStrings.forEach(socketId => {
          io.sockets.sockets.get(socketId)?.emit('game-on', ({
            gameId: newGameId,
            yourPlayerId: socketId,
            gridSize,
            playerStrings,
          }));
        });
      }
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
    const socketIdsToSendTo = playerStrings.filter(playerString => playerString !== socket.id);
    socketIdsToSendTo.forEach(socketId => {
      io.to(socketId).emit('receive-move', move, gameId);
    });
    console.log({ socketIdsToSendTo })


  });
});

io.listen(3003);