import fs from 'fs';
import { GameResult, Player, ServerToClientEvents, UserAuth, UserInfo } from "../commonts/types";
import * as uuid from 'uuid';
import { Socket } from 'socket.io';
import { COMPUTER_PLAYER_USER_IDS, io } from '.';
import generateUsername from './usernames/generate-username';

export const usernamesToSockets: Record<string, Socket["id"][]> = {};

export async function getUserByID(username: string): Promise<UserInfo | null> {
  let foundUser: string | undefined;
  try {
    foundUser = fs.readFileSync(`./json/users/user-${username}.json`, 'utf8');
  } catch (e) {
    console.error('user not found', username);
    if (COMPUTER_PLAYER_USER_IDS.includes(username)) {
      console.log('creating computer player');
      const newUser = await createNewUser({
        username
      });
      console.log('created', newUser)
      return newUser;
    }
  }
  return foundUser ? JSON.parse(foundUser) as UserInfo : null;
}

export async function validateUserAuth(userAuth: UserAuth): Promise<UserInfo | null> {
  console.log(`validating ${JSON.stringify(userAuth)}`);
  let foundUser = await getUserByID(userAuth.username);
  if (!foundUser) {
    console.error(`user not found for ${userAuth.username}`);
    return null;
  }
  if (foundUser.authToken !== userAuth.authToken) {
    console.error(`invalid authToken for ${userAuth.username}.... found ${foundUser.authToken} ... supplied ... ${userAuth.authToken}`)
    return null;
  }
  console.log(`SUCCESS validate for ${foundUser.username}`);
  return foundUser;
}

export async function saveUserInfo(userInfo: UserInfo) {
  fs.writeFileSync(`./json/users/user-${userInfo.username}.json`, JSON.stringify(userInfo, null, 2), 'utf8');
}

export async function createNewUser(partial?: Partial<UserInfo>): Promise<UserInfo> {
  const userInfo: UserInfo = {
    username: await generateUsername(),
    authToken: uuid.v4(),
    score: 100,
    ...partial,
  };
  await saveUserInfo(userInfo);
  return userInfo;
}

export function emitToUsers<Event extends keyof ServerToClientEvents>(
  usernames: string[],
  event: Event,
  ...args: Parameters<ServerToClientEvents[Event]>
) {
  const matchingSockets = usernames
    .map(playerUsername => {
      const playerSocketIDs = usernamesToSockets[playerUsername] || [];
      return {
        playerUsername,
        playerSocketIDs,
        playerSockets: playerSocketIDs
          .map(socketId => io.sockets.sockets.get(socketId))
          .filter(Boolean)
      }
    });
  matchingSockets.forEach(({ playerUsername, playerSocketIDs, playerSockets }) => {
    if (!playerSocketIDs.length || !playerSockets.length) {
      if (!COMPUTER_PLAYER_USER_IDS.includes(playerUsername)) {
        return console.log(`no sockets found for playerUsername: ${playerUsername}`);
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
  return emitToUsers(players.map(player => player.username), event, ...args);
}


export async function updateUserAfterGame(username: string, gameResult: GameResult, skipAuthChange?: boolean) {
  console.log(`updating score for ${username}`);
  const userInfo = await getUserByID(username);
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
  emitToUsers([username], 'user-info', newUserInfo);
}

export async function getAllUsernames(): Promise<string[]> {
  return fs.readdirSync('./json/users')
    .filter(fileName => fileName.endsWith('.json'))
    .map(fileName => fileName.split('.json').shift()?.slice(5))
    .filter((fileName): fileName is string => !!fileName);
}

export async function getAllUsers(): Promise<UserInfo[]> {
  const allUserList = await getAllUsernames();
  console.log({ allUserList })
  const allUserInfos = await Promise.all(allUserList.map(username => getUserByID(username)));
  return allUserInfos.filter((userInfo): userInfo is UserInfo => !!userInfo);
}