import fs from 'fs';
import { GameResult, Player, ServerToClientEvents, UserAuth, UserInfo } from "../commonts/types";
import * as uuid from 'uuid';
import { Socket } from 'socket.io';
import { COMPUTER_PLAYER_USER_IDS, io } from '.';
import { generateUsername } from "unique-username-generator";
import { userInfo } from 'os';
export const userIDsToSockets: Record<string, Socket["id"][]> = {};

export async function getUserByID(userID: string): Promise<UserInfo | null> {
  let foundUser: string | undefined;
  try {
    foundUser = fs.readFileSync(`./json/users/user-${userID}.json`, 'utf8');
  } catch (e) {
    console.error('user not found', userID);
  } finally {
    return foundUser ? JSON.parse(foundUser) as UserInfo : null;
  }
}

export async function validateUserAuth(userAuth: UserAuth): Promise<UserInfo | null> {
  console.log(`validating ${JSON.stringify(userAuth)}`);
  let foundUser = await getUserByID(userAuth.userID);
  if (!foundUser) {
    console.error(`user not found for ${userAuth.userID}`);
    return null;
  }
  if (foundUser.authToken !== userAuth.authToken) {
    console.error(`invalid authToken for ${userAuth.userID}.... found ${foundUser.authToken} ... supplied ... ${userAuth.authToken}`)
    return null;
  }
  console.log(`SUCCESS validate for ${foundUser.userID}`);
  return foundUser;
}

export async function saveUserInfo(userInfo: UserInfo) {
  fs.writeFileSync(`./json/users/user-${userInfo.userID}.json`, JSON.stringify(userInfo, null, 2), 'utf8');
}

export async function createNewUser(partial?: Partial<UserInfo>): Promise<UserInfo> {
  const userInfo: UserInfo = {
    userID: generateUsername(),
    authToken: uuid.v4(),
    score: 100,
    ...partial,
  };
  await saveUserInfo(userInfo);
  return userInfo;
}

export function emitToUsers<Event extends keyof ServerToClientEvents>(
  userIDs: string[],
  event: Event,
  ...args: Parameters<ServerToClientEvents[Event]>
) {
  const matchingSockets = userIDs
    .map(playerUserID => {
      const playerSocketIDs = userIDsToSockets[playerUserID] || [];
      return {
        playerUserID,
        playerSocketIDs,
        playerSockets: playerSocketIDs
          .map(socketId => io.sockets.sockets.get(socketId))
          .filter(Boolean)
      }
    });
  matchingSockets.forEach(({ playerUserID, playerSocketIDs, playerSockets }) => {
    if (!playerSocketIDs.length || !playerSockets.length) {
      if (!COMPUTER_PLAYER_USER_IDS.includes(playerUserID)) {
        return console.log(`no sockets found for playerUserID: ${playerUserID}`);
      }
    };
    playerSockets.forEach(playerSocket => playerSocket?.emit(event, ...args));
  });
}

export function emitToPlayers<Event extends keyof ServerToClientEvents>(
  players: Player[],
  event: Event,
  ...args: Parameters<ServerToClientEvents[Event]>
) {
  return emitToUsers(players.map(player => player.userID), event, ...args);
}


export async function updateUserAfterGame(userID: string, gameResult: GameResult, skipAuthChange?: boolean) {
  console.log(`updating score for ${userID}`);
  const userInfo = await getUserByID(userID);
  if (!userInfo) {
    return;
  }
  const newUserInfo: UserInfo = {
    ...userInfo,
    gamesPlayed: [...userInfo.gamesPlayed || [], gameResult],
    ...!skipAuthChange && { authToken: uuid.v4() },
    score: gameResult[2],
  };
  console.log(`saving score update: before ${userInfo.score} after ${newUserInfo.score}`);
  await saveUserInfo(newUserInfo);
  emitToUsers([userID], 'user-info', newUserInfo);
}

export async function getAllUsers(): Promise<UserInfo[]> {
  const allUserList = fs.readdirSync('./json/users')
    .filter(fileName => fileName.endsWith('.json'))
    .map(fileName => fileName.split('.json').shift()?.slice(5))
    .filter((fileName): fileName is string => !!fileName);
  console.log({ allUserList })
  const allUserInfos = await Promise.all(allUserList.map(userID => getUserByID(userID)));
  return allUserInfos.filter((userInfo): userInfo is UserInfo => !!userInfo);
}