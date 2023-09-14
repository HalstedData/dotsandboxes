import { create } from 'zustand';
import { GameInProgress, GameSocket } from './App';
import { UserInfo } from '../../commonts/types';
import { io } from 'socket.io-client';
import { LeaderboardType } from '../../node-ws-server/leaderboard';

type AppState = {
  socket: GameSocket;
  gameKey: number;
  gameInProgress: GameInProgress | null;
  socketStatus: string;
  userInfo: UserInfo | null;
  newGame: (gameInProgress: GameInProgress | null) => void;
  setSocketStatus: (socketStatus: string) => void;
  setUserInfo: (userInfo: UserInfo) => void;
  leaderboard: LeaderboardType | null;
  setLeaderboard: (Leaderboard: LeaderboardType) => void;
}

const initSocket = () => io('https://chiefsmurph.com', {
  path: '/dotsandboxes/api/socket.io',
  secure: true
});

// io(
//   window.location.href.includes('localhost') && false ? "http://localhost:3003" : "https://chiefsmurph.com/dotsandboxes/api", //"http://38.108.119.159:3003/",
//   { transports: ['websocket'], autoConnect: false }
// );

const useAppStore = create<AppState>()((set, get) => ({
  socket: initSocket(),
  gameKey: 0,
  gameInProgress: null,
  socketStatus: '',
  userInfo: null,
  newGame: (gameInProgress) => set({
    gameInProgress,
    gameKey: get().gameKey + 1
  }),
  setSocketStatus: (socketStatus) => set({ socketStatus }),
  setUserInfo: (userInfo) => set({ userInfo }),
  leaderboard: null,
  setLeaderboard: (leaderboard) => set({ leaderboard }),
}));

export default useAppStore;