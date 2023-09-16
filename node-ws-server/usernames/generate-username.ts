import colors from './data/colors';
import animals from './data/animals';
import { getAllUserIDs } from '../users';

const createRandomUsername = () => {
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
    const randomTwoDigits = 10 + Math.floor(Math.random() * 90);
    return `${randomColor}${randomAnimal}${randomTwoDigits}`.toLowerCase();
};

export default async function generateUsername() {
    const randomUsername = createRandomUsername();
    const allUserIDsTaken = await getAllUserIDs();
    return allUserIDsTaken.includes(randomUsername)
        ? generateUsername() 
        : randomUsername;
}