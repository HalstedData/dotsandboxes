import colors from './data/colors';
import animals from './data/animals';
import { getAllUsernames } from '../users';

const createRandomUsername = () => {
    const getRandomElementUnderFiveChars = (collection: Array<string>) => {
        const underFive = collection.filter(item => item.length <= 5);
        return underFive[Math.floor(Math.random() * underFive.length)];
    }
    const randomColor = getRandomElementUnderFiveChars(colors);
    const randomAnimal = getRandomElementUnderFiveChars(animals)
    const randomTwoDigits = 10 + Math.floor(Math.random() * 90);
    return `${randomColor}${randomAnimal}${randomTwoDigits}`.toLowerCase();
};

export default async function generateUsername(): Promise<string> {
    const randomUsername = createRandomUsername();
    const allUsernamesTaken = await getAllUsernames();
    return allUsernamesTaken.includes(randomUsername)
        ? generateUsername()
        : randomUsername;
}