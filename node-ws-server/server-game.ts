import fs from 'fs';
import { GameV2 } from "../commonts/types";
import { v4 as uuidv4 } from 'uuid';
import { emitToPlayers, emitToUsers, getUserByID, updateUserScore, userIDsToSockets } from './users';
import { io } from '.';

type NewGameParams = Pick<GameV2["meta"], 'gridSize' | 'players'>;
export const gamesInProgress: Record<GameV2["meta"]["gameId"], GameV2> = {};

export function newGame(params: NewGameParams) {
  const { gridSize, players } = params;
  const id = uuidv4();
  const gameV2: GameV2 = {
    meta: {
      gameId: id,
      gridSize,
      players,
      moveOrder: [],
    },
    state: {
      hlines: Array.from({ length: gridSize + 1 }, () => Array.from({ length: gridSize }, () => null)),
      vlines: Array.from({ length: gridSize }, () => Array.from({ length: gridSize + 1 }, () => null)),
      squares: Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => null)),
      currentPlayer: players[0].userID,
      isGameOver: false,
    }
  };
  gamesInProgress[id] = gameV2;
  return id;
};


export function handleGameOver(gameId: string) {
  const game = gamesInProgress[gameId];
  const { gridSize, players, winnerUserID } = game.meta;
  const { isGameOver, squares } = game.state;
  if (!isGameOver || !winnerUserID) {
    return console.error('handling game over but !isGameOver || !winnerUserID')
  }
  fs.writeFileSync(`./json/games/game-${gameId}.json`, JSON.stringify(game.meta, null, 2));

  const updateUserScores = async () => {

    const allUpdates = players.map(player => {
      const { userID, score: beforeScore } = player;
      const squarePerc = squares.flat().filter(square => square === player.userID).length / squares.flat().length;
      const otherUsersScores = players
        .filter(({ userID: otherUserID, }) => otherUserID !== userID)
        .map(({ score: otherUserScore }) => otherUserScore);
      const avgScoreOtherUsers = otherUsersScores.reduce((acc, score) => acc + score, 0) / otherUsersScores.length;
      const isWinner = winnerUserID === userID;
      const diff = avgScoreOtherUsers - beforeScore;
      const changeAffectBySquarePerc = diff * squarePerc;
      const update = isWinner ? Math.max(20, changeAffectBySquarePerc) : Math.min(-20, changeAffectBySquarePerc);
      return {
        userID,
        beforeScore,
        update,
      }
    });
    for (let { userID, update } of allUpdates) {
      await updateUserScore(userID, update);
    }
  };

  updateUserScores();

  const startNewGameWithSameSettings = (gameId: string) => {
    if (!game) {
      return console.error('no game found');
    }
    delete gamesInProgress[gameId];
    const newGameId = newGame({
      gridSize,
      players,
    });
    emitToPlayers(players, 'game-on', {
      gameId: newGameId,
      gridSize,
      players,
    });
  };
  setTimeout(() => startNewGameWithSameSettings(gameId), 8000);
}

export function playerHasDisconnected(userID: string) {
  const gameInProgress = Object.values(gamesInProgress)
    .find(game => game.meta.players.some(player => player.userID === userID));
  if (!gameInProgress) return;
  emitToPlayers(gameInProgress.meta.players, 'player-disconnected');
  delete gamesInProgress[gameInProgress.meta.gameId];
}