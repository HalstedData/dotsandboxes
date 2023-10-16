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
      currentPlayer: players[0].username,
      isGameOver: false,
    }
  };
  gamesInProgress[id] = gameV2;
  return id;
};


export async function handleGameOver(gameID: string) {
  const game = gamesInProgress[gameID];
  const { gridSize, players, winnerUsername } = game.meta;
  const { isGameOver, squares } = game.state;
  if (!isGameOver || !winnerUsername) {
    return console.error('handling game over but !isGameOver || !winnerUsername')
  }
  fs.writeFileSync(`./json/games/game-${gameID}.json`, JSON.stringify(game.meta, null, 2));

  // update user scores
  const allResults: Array<{
    username: string;
    gameResult: GameResult
  }> = players.map(player => {
    const { username, score: beforeScore } = player;
    const squarePerc = squares.flat().filter(square => square === player.username).length / squares.flat().length;
    const otherUsers = players
      .filter(({ username: otherUsername, }) => otherUsername !== username);
    const otherUsersScores = otherUsers
      .map(({ score: otherUserScore }) => otherUserScore);
    const avgScoreOtherUsers = otherUsersScores.reduce((acc, score) => acc + score, 0) / otherUsersScores.length;
    const isWinner = winnerUsername === username;
    const diff = avgScoreOtherUsers - beforeScore;

    let changeAffectBySquarePerc = diff * squarePerc;
    if (changeAffectBySquarePerc < 0) {
      changeAffectBySquarePerc *= 0.3;
    }
    const scoreChange = isWinner ? Math.max(18, changeAffectBySquarePerc) : Math.min(-12, changeAffectBySquarePerc);
    const newScore = Math.round(beforeScore + scoreChange);
    const gameResult = [beforeScore, isWinner ? 'W' : 'L', newScore, gameID, ...otherUsers.map(player => player.username)] as GameResult;
    return {
      username,
      gameResult,
    };
  });
  for (let { username, gameResult } of allResults) {
    await updateUserAfterGame(username, gameResult);
  }

  await handleGameResults(allResults.map(({ gameResult }) => gameResult));

  const startNewGameWithSameSettings = (gameID: string) => {
    const game = gamesInProgress[gameID];
    if (!game) {
      return console.error('no game found');
    }
    const { players } = game.meta;
    delete gamesInProgress[gameID];
    const newPlayers = allResults
      .filter(player => players.some(p => p.username === player.username))
      .map(player => ({
        username: player.username,
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

export async function receiveLineFromUsername(line: Line, username: string, gameID: string) {

  // amount of times called 50x / 1 min ?
  // more than once in a half a second

  const gameInProgress = gamesInProgress[gameID];

  if (!gameInProgress) {
    return console.error("Invalid gameID.  Game not found.");
  }


  // validate this is their turn

  if (gameInProgress.state.currentPlayer !== username) {
    return console.error(`This person tried to make a move when it wasn't their turn: ${username}`);
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
      .map(player => player.username)
      .filter(playerUserId => playerUserId !== username),
    'receive-line', line, gameID
  );

  if (!nextGame.state.isGameOver && COMPUTER_PLAYER_USER_IDS.includes(nextGame.state.currentPlayer)) {
    const waitSeconds = nextGame.state.currentPlayer === 'pinkmonkey23'
      ? 0.3 + (Math.random() * 0.5)
      : 0.7 + Math.random() * 1.5;
    setTimeout(async () => {
      console.log('getting computer move');
      const computerMove = await getComputerMove(nextGame);
      console.log('got computer move', computerMove);
      receiveLineFromUsername(computerMove, nextGame.state.currentPlayer, nextGame.meta.gameID);
    }, 1000 * waitSeconds);
  }
}

// export async function playerHasDropped(username:string, gameID: string) {
//   const gameInProgress = Object.values(gamesInProgress)
//     .find(game => game.meta.gameID === gameID);

// }

export async function playerHasDisconnected(username: string, gameID?: string) {
  const matchingGames = Object.values(gamesInProgress)
    .filter(game => {
      const matchesGameIDFilter = (!gameID || game.meta.gameID === gameID);
      const includesCurrentUser = game.meta.players.some(player => player.username === username);
      return matchesGameIDFilter && includesCurrentUser;
    });
  for (let gameInProgress of matchingGames) {
    const { players, gameID: matchingGameID } = gameInProgress.meta;
    const { isGameOver } = gameInProgress.state;
    emitToPlayers(players.filter(player => player.username !== username), 'player-disconnected');
    if (!isGameOver) {
      const squaresCompleted = gameInProgress.state.squares.flat().filter(Boolean).length;
      const gameResults: GameResult[] = [];
      for (let player of players) {
        const isPlayerThatDisconnected = player.username === username;
        const opponentUsernames = players
          .filter(comparePlayer => comparePlayer.username !== player.username)
          .map(player => player.username);
        const scoreChange = isPlayerThatDisconnected
          ? (squaresCompleted ? -20 : 0)
          : squaresCompleted ? 10 : 0;
        const gameResult: GameResult = [
          player.score,
          isPlayerThatDisconnected ? 'DROPPED' : 'OPP-DROPPED',
          player.score + scoreChange,
          matchingGameID,
          ...opponentUsernames,
        ];
        await updateUserAfterGame(
          player.username,
          gameResult,
          isPlayerThatDisconnected
        );
        gameResults.push(gameResult);
      }
      await handleGameResults(gameResults);
    }
    delete gamesInProgress[matchingGameID];
  };


}