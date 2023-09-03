import fs from 'fs';
import { GameV2 } from "../commonts/types";
import { v4 as uuidv4 } from 'uuid';
import { emitToUsers, getUserByID, updateUserScore, userIDsToSockets } from './users';
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
  const { gridSize, playerStrings, winnerUserID } = game.meta;
  const { isGameOver, squares } = game.state;
  if (!isGameOver || !winnerUserID) {
    return console.error('handling game over but !isGameOver || !winnerUserID')
  }
  fs.writeFileSync(`./json/games/game-${gameId}.json`, JSON.stringify(game.meta, null, 2));

  const updateUserScores = async () => {
    const allUserInfos = (await Promise.all(
      playerStrings.map(async userID => ({
        userID,
        userInfo: await getUserByID(userID),
        squarePerc: squares.flat().filter(square => square === userID).length / squares.flat().length
      }))
    ));

    for (let { userInfo, userID, squarePerc } of allUserInfos) {
      if (!userInfo) {
        console.error(`when updating scores ... could not get userInfo for userID ${userID}`);
        continue;
      }
      const myScore = userInfo.score;
      const otherUsersScores = allUserInfos
        .filter(({ userID: otherUserID, }) => otherUserID !== userID)
        .map(({ userInfo: otherUserInfo }) => otherUserInfo?.score)
        .filter((score): score is number => !!score);
      const avgScoreOtherUsers = otherUsersScores.reduce((acc, score) => acc + score, 0) / otherUsersScores.length;
      const isWinner = winnerUserID === userID;
      const diff = avgScoreOtherUsers - myScore;
      const changeAffectBySquarePerc = diff * squarePerc;
      const update = isWinner ? Math.max(20, changeAffectBySquarePerc) : Math.min(-20, changeAffectBySquarePerc);
      console.log({ isWinner, myScore, avgScoreOtherUsers, diff, changeAffectBySquarePerc, update, })
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