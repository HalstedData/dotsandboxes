import fs from 'fs';
import { Server } from 'socket.io';
import { GameProps, GameState, Line } from '../react-vite-game/src/Game';
import { v4 as uuidv4 } from 'uuid';
import { makeMove } from '../react-vite-game/src/make-move';


type GameOnResponse = {
  gameId: string;
  yourPlayerId: string;
  gridSize: number;
  playerStrings: string[];
};

type GameRequestResponse = GameOnResponse | 'waiting';

const waitingRooms: Map<number, string[]> = new Map();

type ServerGameState = GameState & Pick<GameProps, 'playerStrings'>;

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


type ClientToServerEvents = {
  "game-request": (gridSize: number, cb: (response: GameRequestResponse) => void) => void;
  "send-move": (move: Line, gameId: string) => void;
}
type ServerToClientEvents = {
  "game-on": (response: GameRequestResponse) => void;
  "receive-move": (move: Line, gameId: string) => void;
}
const io = new Server<ClientToServerEvents, ServerToClientEvents>({
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
io.on('connection', socket => {
  console.log('new connection', socket.id);
  socket.on('game-request', (gridSize, cb) => {

    const waiting = waitingRooms.get(gridSize) || [];
    const returnToWaitingRoom = () => {
      waitingRooms.set(gridSize, [...waiting, socket.id]);
      return cb('waiting');
    };

    console.log(waitingRooms);
    const playerToMatch = waiting.shift();
    const playerToMatchSocket = playerToMatch && io.sockets.sockets.get(playerToMatch);
    if (!playerToMatch || !playerToMatchSocket) {
      return returnToWaitingRoom();
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