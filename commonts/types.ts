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
  "user-info": (userInfo: UserInfo) => void;
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







// v2

export type GameV2Meta = {
  gameId: string;
  gridSize: number;
  playerStrings: string[];
};

export type GameStateV2 = {
  hlines: LineArray;
  vlines: LineArray;
  squares: LineArray;
  currentPlayer: string;
  isGameOver: boolean;
}


export type GameV2<CustomInfo = {}> = {
  info: GameV2Meta & CustomInfo;
  state: GameState;
}

export type ClientGameV2 = GameV2<{ myPlayerId: string }>;