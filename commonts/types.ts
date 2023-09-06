import { LeaderboardType } from "../node-ws-server/leaderboard";

// APP/SOCKET RELATED
export type UserAuth = { userID: string, authToken: string };
export type GameResult = [
  beforeScore: number,
  winOrLoss: 'W' | 'L' | 'DROPPED' | 'OPP-DROPPED',
  afterScore: number,
  gameID: string,
  ...opponentUserIDs: string[]
];
// export type GameResult = [
//   beforeScore: number,
//   winOrLoss: 'W' | 'L',
//   afterScore: number,
//   gameID: string,
//   (string)?
// ];
export type UserInfo = UserAuth & {
  gamesPlayed?: GameResult[],  // gameID's
  score: number;
};

export type GameOnResponse = Pick<GameV2Meta, 'gameID' | 'gridSize' | 'players'>;

export type GameRequestResponse = GameOnResponse | 'waiting';

export type ClientToServerEvents = {
  "game-request": (gridSize: number, cb: (response: GameRequestResponse) => void) => void;
  "send-line": (line: Line, gameID: string) => void;
}
export type ServerToClientEvents = {
  "game-on": (response: GameOnResponse) => void;
  "receive-line": (line: Line, gameID: string) => void;
  "user-info": (userInfo: UserInfo) => void;
  "player-disconnected": () => void;
  "leaderboard": (leaderboard: LeaderboardType) => void;
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
  gameID: string;
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