// APP/SOCKET RELATED
export type UserAuth = { userID: string, authToken: string };
export type UserInfo = UserAuth & {
  gamesPlayed?: string[],  // gameId's
  score: number;
};

export type GameOnResponse = {
  gameId: string;
  yourPlayerId: string;
  gridSize: number;
  playerStrings: string[];
};

export type GameRequestResponse = GameOnResponse | 'waiting';

export type ClientToServerEvents = {
  "game-request": (gridSize: number, cb: (response: GameRequestResponse) => void) => void;
  "send-move": (move: Line, gameId: string) => void;
}
export type ServerToClientEvents = {
  "game-on": (response: GameOnResponse) => void;
  "receive-move": (move: Line, gameId: string) => void;
  "user-auth": (userAuth: UserAuth) => void;
}


// GAME RELATED

type LineArray = (string | null)[][];

export type Line = ['h' | 'v', number, number];

export type GameState = {
  gridSize: number;
  hlines: LineArray;
  vlines: LineArray;
  squares: LineArray;
  currentPlayer: string;
  isGameOver: boolean;
}



export type GameV2<CustomInfo = {}> = {
  info: CustomInfo & {
    gameId: string;
    gridSize: number;
    playerStrings: string[];
  },
  state: GameState;
}