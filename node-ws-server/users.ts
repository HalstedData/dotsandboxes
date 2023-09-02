import fs from 'fs';
import { UserAuth, UserInfo } from "../commonts/types";
import { v4 as uuidv4 } from 'uuid';

export async function validateUserAuth(userAuth: UserAuth): Promise<UserInfo | null> {
  console.log(`validating ${JSON.stringify(userAuth)}`);
  let foundUser: string | undefined;
  try {
    foundUser = fs.readFileSync(`./json/users/${userAuth.userID}.json`, 'utf8');
  } catch (e) {
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
   userID: uuidv4(),
   authToken: uuidv4(),
   score: 100,
  };
  fs.writeFileSync(`./json/users/${userInfo.userID}.json`, JSON.stringify(userInfo, null, 2), 'utf8');
  return userInfo;
}