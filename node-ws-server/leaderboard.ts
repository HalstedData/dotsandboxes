import { userInfo } from "os";
import { GameResult, UserInfo } from "../commonts/types";
import { getAllUsers } from "./users";
import { io } from ".";


type LeaderboardEntry = Pick<UserInfo, 'username' | 'score'>;
export type LeaderboardType = {
  lastUpdated: number;
  entries: LeaderboardEntry[];
}

const NUM_ON_BOARD = 7;
let leaderboard: LeaderboardType | null = null;

export async function updateLeaderboard(): Promise<LeaderboardType> {
  const allUserInfos = await getAllUsers();
  const sortedByScore = allUserInfos.sort((a, b) => b.score - a.score);
  const topBoard = sortedByScore.slice(0, NUM_ON_BOARD);
  const leaderboardEntries = topBoard.map(userInfo => ({
    username: userInfo.username,
    score: userInfo.score
  }));
  leaderboard = {
    lastUpdated: Date.now(),
    entries: leaderboardEntries,
  };
  io.sockets.emit('leaderboard', leaderboard);
  console.log('updated leaderboard', leaderboard)
  return leaderboard;
};

export async function handleGameResults(gameResults: GameResult[]) {
  if (leaderboard === null || !leaderboard.entries.length) {
    return updateLeaderboard();
  }
  const highestScore = Math.max(
    ...gameResults.map(gameResult => [gameResult[0], gameResult[2]]).flat()
  );
  const lowestScoreOnLeaderboardCurrently = leaderboard.entries[leaderboard.entries.length - 1].score;
  const needsUpdating = highestScore >= lowestScoreOnLeaderboardCurrently;
  // console.log({ highestScore, lowestScoreOnLeaderboardCurrently, needsUpdating })
  if (needsUpdating) {
    return updateLeaderboard();
  }
}

export function getLeaderboard(): LeaderboardType {
  return leaderboard as LeaderboardType;
}