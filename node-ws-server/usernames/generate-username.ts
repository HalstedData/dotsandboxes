import colors from './data/colors';
import animals from './data/animals';

export default function generateUsername() {
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
    const randomTwoDigits = 10 + Math.floor(Math.random() * 90);
    return `${randomColor}${randomAnimal}${randomTwoDigits}`;
}