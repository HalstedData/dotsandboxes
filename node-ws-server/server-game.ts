import fs from 'fs';
import { GameV2 } from "../commonts/types";
import { v4 as uuidv4 } from 'uuid';
import { emitToUsers, userIDsToSockets } from './users';
import { io } from '.';

type NewGameParams = Pick<GameV2["meta"], 'gridSize' | 'playerStrings'>;
export const gamesInProgress: Record<GameV2["meta"]["gameId"], GameV2> = {};

export function newGame(params: NewGameParams) {
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


export function handleGameOver(gameId: string) {
  const game = gamesInProgress[gameId];
  const { gridSize, playerStrings } = game.meta;
  console.log('GAME OVER');
  fs.writeFileSync(`./json/games/game-${gameId}.json`, JSON.stringify(game, null, 2));

  const startNewGameWithSameSettings = (gameId: string) => {
    if (!game) {
      return console.error('no game found');
    }
    delete gamesInProgress[gameId];
    const newGameId = newGame({
      gridSize,
      playerStrings,
    });
    emitToUsers(playerStrings, 'game-on', {
      gameId: newGameId,
      gridSize,
      playerStrings,
    });
  };
  setTimeout(() => startNewGameWithSameSettings(gameId), 4000);
}