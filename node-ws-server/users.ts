import fs from 'fs';
import { ServerToClientEvents, UserAuth, UserInfo } from "../commonts/types";
import * as uuid from 'uuid';
import { Socket } from 'socket.io';
import { io } from '.';

export const userIDsToSockets: Record<string, Socket["id"][]> = {};

export async function validateUserAuth(userAuth: UserAuth): Promise<UserInfo | null> {
  console.log(`validating ${JSON.stringify(userAuth)}`);
  let foundUser: string | undefined;
  try {
    foundUser = fs.readFileSync(`./json/users/user-${userAuth.userID}.json`, 'utf8');
  } catch (e) {
    console.error('user not found');
    return null;
  }
  if (!foundUser) {
    console.error('user not found');
    return null;
  }
  const parsed = JSON.parse(foundUser) as UserInfo;
  if (parsed.authToken !== userAuth.authToken) {
    console.error(`invalid authToken for ${userAuth.userID}.... found ${parsed.authToken} ... supplied ... ${userAuth.authToken}`)
    return null;
  }
  console.log(`SUCCESS validate for ${parsed.userID}`);
  return parsed;
}

export async function createNewUser(): Promise<UserInfo> {
  const userInfo: UserInfo = {
    userID: uuid.v4(),
    authToken: uuid.v4(),
    score: 100,
  };
  fs.writeFileSync(`./json/users/user-${userInfo.userID}.json`, JSON.stringify(userInfo, null, 2), 'utf8');
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