import fs from 'fs';
import { GameResult, GameV2 } from "../commonts/types";
import { v4 as uuidv4 } from 'uuid';
import { emitToPlayers, updateUserAfterGame } from './users';
import { io } from '.';
import { handleGameResults } from './leaderboard';

type NewGameParams = Pick<GameV2["meta"], 'gridSize' | 'players'>;
export const gamesInProgress: Record<GameV2["meta"]["gameID"], GameV2> = {};

export function newGame(params: NewGameParams) {
  const { gridSize, players } = params;
  const id = uuidv4();
  const gameV2: GameV2 = {
    meta: {
      gameID: id,
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


export async function handleGameOver(gameID: string) {
  const game = gamesInProgress[gameID];
  const { gridSize, players, winnerUserID } = game.meta;
  const { isGameOver, squares } = game.state;
  if (!isGameOver || !winnerUserID) {
    return console.error('handling game over but !isGameOver || !winnerUserID')
  }
  fs.writeFileSync(`./json/games/game-${gameID}.json`, JSON.stringify(game.meta, null, 2));

  // update user scores
  const allResults: Array<{
    userID: string;
    gameResult: GameResult
  }> = players.map(player => {
    const { userID, score: beforeScore } = player;
    const squarePerc = squares.flat().filter(square => square === player.userID).length / squares.flat().length;
    const otherUsers = players
      .filter(({ userID: otherUserID, }) => otherUserID !== userID);
    const otherUsersScores = otherUsers
      .map(({ score: otherUserScore }) => otherUserScore);
    const avgScoreOtherUsers = otherUsersScores.reduce((acc, score) => acc + score, 0) / otherUsersScores.length;
    const isWinner = winnerUserID === userID;
    const diff = avgScoreOtherUsers - beforeScore;
    const changeAffectBySquarePerc = diff * squarePerc;
    const scoreChange = isWinner ? Math.max(20, changeAffectBySquarePerc) : Math.min(-20, changeAffectBySquarePerc);
    const newScore = Math.round(beforeScore + scoreChange);
    const gameResult = [beforeScore, isWinner ? 'W' : 'L', newScore, ...otherUsers.map(player => player.userID)] as GameResult;
    return {
      userID,
      gameResult,
    };
  });
  for (let { userID, gameResult } of allResults) {
    await updateUserAfterGame(userID, gameResult);
  }

  await handleGameResults(allResults.map(({ gameResult }) => gameResult));

  const startNewGameWithSameSettings = (gameID: string) => {
    if (!game) {
      return console.error('no game found');
    }
    delete gamesInProgress[gameID];
    const newPlayers = allResults.map(player => ({
      userID: player.userID,
      score: player.gameResult[2]
    }));
    const newGameID = newGame({
      gridSize,
      players: newPlayers,
    });
    emitToPlayers(players, 'game-on', {
      gameID: newGameID,
      gridSize,
      players: newPlayers,
    });
  };
  setTimeout(() => startNewGameWithSameSettings(gameID), 8000);
}

export function playerHasDisconnected(userID: string) {
  const gameInProgress = Object.values(gamesInProgress)
    .find(game => game.meta.players.some(player => player.userID === userID));
  if (!gameInProgress) return;
  emitToPlayers(gameInProgress.meta.players, 'player-disconnected');
  delete gamesInProgress[gameInProgress.meta.gameID];
}