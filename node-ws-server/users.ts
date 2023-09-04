import fs from 'fs';
import { ServerToClientEvents, UserAuth, UserInfo } from "../commonts/types";
import * as uuid from 'uuid';
import { Socket } from 'socket.io';
import { io } from '.';
import { generateUsername } from "unique-username-generator";
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

export async function createNewUser(): Promise<UserInfo> {
  const userInfo: UserInfo = {
    userID: generateUsername(),
    authToken: uuid.v4(),
    score: 100,
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
      const playerSocketIDs = userIDsToSockets[playerUserID];
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
      return console.log(`no sockets found for playerUserID: ${playerUserID}`);
    };
    playerSockets.forEach(playerSocket => playerSocket?.emit(event, ...args));
  });
}


export async function updateUserScore(userID: string, change: number) {
  console.log(`updating score for ${userID}`);
  const userInfo = await getUserByID(userID);
  if (!userInfo) {
    return;
  }
  const newUserInfo: UserInfo = {
    ...userInfo,
    authToken: uuid.v4(),
    score: Math.round(userInfo.score + change)
  };
  console.log(`saving score update: before ${userInfo.score} after ${newUserInfo.score}`);
  await saveUserInfo(newUserInfo);
  emitToUsers([userID], 'user-info', newUserInfo);
}