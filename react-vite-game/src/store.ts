import { create } from 'zustand';
import { GameInProgress, GameSocket } from './App';
import { UserInfo } from '../../commonts/types';
import { io } from 'socket.io-client';

type AppState = {
  socket: GameSocket;
  gameKey: number;
  gameInProgress: GameInProgress | null;
  socketStatus: string;
  userInfo: UserInfo | null;
  newGame: (gameInProgress: GameInProgress | null) => void;
  setSocketStatus: (socketStatus: string) => void;
  setUserInfo: (userInfo: UserInfo) => void;
}

const initSocket = () => io(
  window.location.href.includes('localhost') ? "http://localhost:3003" : "http://38.108.119.159:3003/",
  { transports: ['websocket'], autoConnect: false }
);

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
}));

export default useAppStore;