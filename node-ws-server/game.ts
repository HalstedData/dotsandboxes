import fs from 'fs';
import { GameResult, GameV2, Line, ServerGameV2 } from "../commonts/types";
import { v4 as uuidv4 } from 'uuid';
import { emitToPlayers, emitToUsers, updateUserAfterGame } from './users';
import { COMPUTER_PLAYER_USER_IDS, io } from '.';
import { handleGameResults } from './leaderboard';
import { applyLine } from '../commonts/make-move';
import getComputerMove from './get-computer-move';

type NewGameParams = Pick<ServerGameV2["meta"], 'gridSize' | 'players'>;
export const gamesInProgress: Record<ServerGameV2["meta"]["gameID"], ServerGameV2> = {};

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
    const gameResult = [beforeScore, isWinner ? 'W' : 'L', newScore, gameID, ...otherUsers.map(player => player.userID)] as GameResult;
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

export async function receiveLineFromUserID(line: Line, userID: string, gameID: string) {

  // amount of times called 50x / 1 min ?
  // more than once in a half a second

  const gameInProgress = gamesInProgress[gameID];

  if (!gameInProgress) {
    return console.error("Invalid gameID.  Game not found.");
  }


  // validate this is their turn

  if (gameInProgress.state.currentPlayer !== userID) {
    return console.error(`This person tried to make a move when it wasn't their turn: ${userID}`);
  }

  const nextGame = applyLine(line, gameInProgress);
  gamesInProgress[gameID] = nextGame;

  const { players } = nextGame.meta;
  const { isGameOver } = nextGame.state;

  if (isGameOver) {
    console.log('GAME OVER');
    handleGameOver(gameID);
  }

  // update the gameState on the server

  // check if it's the end of the game
  // winner of the game has to win on their own turn
  // save the gamestate to json
  // update user json to say games played .... game.id

  // validate if it's a valid move
  // if the move is already taken

  // if it is valid then send it to all the other players in the room

  emitToUsers(
    players
      .map(player => player.userID)
      .filter(playerUserId => playerUserId !== userID),
    'receive-line', line, gameID
  );

  if (!nextGame.state.isGameOver && COMPUTER_PLAYER_USER_IDS.includes(nextGame.state.currentPlayer)) {
    setTimeout(async () => {
      const computerMove = await getComputerMove(nextGame);
      receiveLineFromUserID(computerMove, nextGame.state.currentPlayer, nextGame.meta.gameID);
    }, 1000 * 0.5);
  }
}

export async function playerHasDisconnected(userID: string) {
  const gameInProgress = Object.values(gamesInProgress)
    .find(game => game.meta.players.some(player => player.userID === userID));
  if (!gameInProgress) return;
  const { players, gameID } = gameInProgress.meta;
  emitToPlayers(players, 'player-disconnected');
  for (let player of players) {
    const isPlayerThatDisconnected = player.userID === userID;
    const opponentUserIDs = players
      .filter(comparePlayer => comparePlayer.userID !== player.userID)
      .map(player => player.userID);
    await updateUserAfterGame(
      player.userID,
      [
        player.score,
        isPlayerThatDisconnected ? 'DROPPED' : 'OPP-DROPPED',
        player.score + (isPlayerThatDisconnected ? -30 : 30),
        gameID,
        ...opponentUserIDs,
      ],
      isPlayerThatDisconnected
    );
  }

  delete gamesInProgress[gameInProgress.meta.gameID];
}