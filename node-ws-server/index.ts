import { Server } from 'socket.io';
import { GameState, Line } from '../react-vite-game/src/Game';
import { v4 as uuidv4 } from 'uuid';

type GameOnResponse = {
  id: string;
  yourPlayerId: number;
  gridSize: number;
};

type GameRequestResponse = GameOnResponse | 'waiting';

const waitingRooms: Record<string, string[]> = {};
const gamesInProgress: Record<string, Omit<GameState, 'opponent'>> = {};


const newGame = (gridSize: number) => {
  const id = uuidv4();
  gamesInProgress[id] = {
    hlines: Array.from({ length: gridSize + 1 }, () => Array.from({ length: gridSize }, () => null)),
    vlines: Array.from({ length: gridSize }, () => Array.from({ length: gridSize + 1 }, () => null)),
    gridSize,
    squares: Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => 0)),
    currentPlayer: 1,
    isGameOver: false,
  };
  return id;
};


type ClientToServerEvents = {
  "game-request": (gridSize: number, cb: (response: GameRequestResponse) => void) => void;
  "send-move": (move: Line) => void;
}
type ServerToClientEvents = {
  "game-on": (response: GameRequestResponse) => void;
  "receive-move": (move: Line) => void;
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
    console.log(waitingRooms);
    const waiting = waitingRooms[gridSize] || [];
    const playerToMatch = waiting.shift();
    if (!playerToMatch) {
      // waiting
      waitingRooms[gridSize] = [...waiting, socket.id];
      cb('waiting');
      return;
    }
    const playerToMatchSocket = io.sockets.sockets.get(playerToMatch);
    if (!playerToMatchSocket) {
      // waiting
      waitingRooms[gridSize] = [...waiting, socket.id];
      cb('waiting');
      return;
    }

    const newGameId = newGame(gridSize);
    playerToMatchSocket.join(newGameId);
    console.log(`joining ${newGameId}`)
    socket.join(newGameId);
    playerToMatchSocket.emit('game-on', ({
      id: newGameId,
      yourPlayerId: 1,
      gridSize,
    }));
    cb({
      id: newGameId,
      yourPlayerId: 2,
      gridSize,
    });


  });
  socket.on('send-move', move => {
    console.log('sending move', move, [...socket.rooms]);
    // Get the rooms the current user has joined
    const joinedRooms = [...socket.rooms];

    console.log({joinedRooms});
    // Remove the socket's own ID from the list of joined rooms
    const userJoinedRooms = joinedRooms.filter(room => room !== socket.id);
    userJoinedRooms.forEach(room => {
      socket.to(room).emit('receive-move', move);
    });
  });
});

io.listen(3003);