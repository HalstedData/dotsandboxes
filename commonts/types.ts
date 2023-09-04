// APP/SOCKET RELATED
export type UserAuth = { userID: string, authToken: string };
export type UserInfo = UserAuth & {
  gamesPlayed?: string[],  // gameId's
  score: number;
};

export type GameOnResponse = Pick<GameV2Meta, 'gameId' | 'gridSize' | 'players'>;

export type GameRequestResponse = GameOnResponse | 'waiting';

export type ClientToServerEvents = {
  "game-request": (gridSize: number, cb: (response: GameRequestResponse) => void) => void;
  "send-line": (line: Line, gameId: string) => void;
}
export type ServerToClientEvents = {
  "game-on": (response: GameOnResponse) => void;
  "receive-line": (line: Line, gameId: string) => void;
  "user-info": (userInfo: UserInfo) => void;
  "player-disconnected": () => void;
}

// GAME RELATED
type LineArray = (string | null)[][];
export type Line = ['h' | 'v', number, number];

// v2
export type Move = [userID: string, ...line: Line];
export type Player = {
  userID: string;
  score: number;
};
export type GameV2Meta = {
  gameId: string;
  gridSize: number;
  players: Player[];
  moveOrder: Move[];
  winnerUserID?: string;
};

export type GameV2State = {
  hlines: LineArray;
  vlines: LineArray;
  squares: LineArray;
  currentPlayer: string;
  isGameOver: boolean;
};


export type GameV2<CustomInfo = {}> = {
  meta: GameV2Meta & CustomInfo;
  state: GameV2State;
};

export type ServerGameV2 = GameV2<{
  isComputerGame?: true;
}>

export type ClientSpecificMetaData = {
  width: number;
  myPlayerId: string;
};
export type ClientGameV2 = GameV2<ClientSpecificMetaData>;