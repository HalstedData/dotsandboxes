import { GameState } from "./Game";

const SCREEN_SIZE = 600;
const SCORE_AREA_HEIGHT = 100;
const WINDOW_SIZE = SCREEN_SIZE + SCORE_AREA_HEIGHT;
const RED = "#ff0000";
const BLUE = "#0000ff";
const PLAYER_COLORS = [RED, BLUE];

function checkSquareCompletionH(i: number, j: number, gameState: GameState) {
  const { hlines, vlines, squares, currentPlayer, gridSize } = gameState;
  let squareCompleted = false;
  if (
    i > 0 &&
    vlines[i - 1][j] !== null &&
    vlines[i - 1][j + 1] !== null &&
    hlines[i - 1][j] !== null
  ) {
    squares[i - 1][j] = currentPlayer;
    squareCompleted = true;
  }
  if (
    i < gridSize &&
    vlines[i][j] !== null &&
    vlines[i][j + 1] !== null &&
    hlines[i + 1][j] !== null
  ) {
    squares[i][j] = currentPlayer;
    squareCompleted = true;
  }
  return {
    squareCompleted,
    squares,
  };
}

function checkSquareCompletionV(i: number, j: number, gameState: GameState) {
  const { hlines, vlines, squares, currentPlayer, gridSize } = gameState;
  let squareCompleted = false;
  if (
    j > 0 &&
    hlines[i][j - 1] !== null &&
    hlines[i + 1][j - 1] !== null &&
    vlines[i][j - 1] !== null
  ) {
    squares[i][j - 1] = currentPlayer;
    squareCompleted = true;
  }
  if (
    j < gridSize &&
    hlines[i][j] !== null &&
    hlines[i + 1][j] !== null &&
    vlines[i][j + 1] !== null
  ) {
    squares[i][j] = currentPlayer;
    squareCompleted = true;
  }
  return {
    squareCompleted,
    squares,
  };
}

function updateSquares(line: any[], lineType: string, gameState: GameState) {
  const [lineI, lineJ] = line;
  let squareCompleted = false;
  let squares;
  if (lineType === "h") {
    ({squareCompleted, squares } = checkSquareCompletionH(lineI, lineJ, gameState));
  } else if (lineType === "v") {
    ({squareCompleted, squares } = checkSquareCompletionV(lineI, lineJ, gameState));
  }

  // console.log('current board', JSON.stringify({ verticalLines: vlines, horizontalLines: hlines }, null, 2));
  return {
    squareCompleted,
    squares
  };
}


type UpdateResponse = {
  squareCompleted: boolean;
  updatedGameState: GameState,
}

export function updateLine(x: number, y: number, gameState: GameState): UpdateResponse {

  const { gridSize, hlines, vlines, currentPlayer } = gameState;
  const boxSize = (SCREEN_SIZE - 40) / gridSize;

  let minDistance = Infinity;
  let minLine = null;
  let minType = null;

  for (let i = 0; i < gridSize + 1; i++) {
    for (let j = 0; j < gridSize; j++) {
      const midH = [j * boxSize + boxSize / 2, i * boxSize];
      const distanceH = Math.hypot(midH[0] - x, midH[1] - y);
      if (
        j < gridSize &&
        !hlines[i][j] &&
        distanceH < minDistance
      ) {
        minDistance = distanceH;
        minLine = [i, j];
        minType = "h";
      }
    }

    for (let j = 0; j < gridSize + 1; j++) {
      const midV = [j * boxSize, i * boxSize + boxSize / 2];
      const distanceV = Math.hypot(midV[0] - x, midV[1] - y);
      if (
        i < gridSize &&
        !vlines[i][j] &&
        distanceV < minDistance
      ) {
        minDistance = distanceV;
        minLine = [i, j];
        minType = "v";
      }
    }
  }

  let squareCompleted = false;
  let squares;
  if (minLine !== null) {
    const [lineI, lineJ] = minLine;
    if (minType === "h") {
      hlines[lineI][lineJ] = PLAYER_COLORS[currentPlayer - 1];
      ({ squareCompleted, squares } = updateSquares([lineI, lineJ], "h", gameState));
      // if (!squareCompleted && !squareCompletedLastTurn) {
      //   currentPlayer = currentPlayer === 1 ? 2 : 1;
      // }
    } else if (minType === "v") {
      vlines[lineI][lineJ] = PLAYER_COLORS[currentPlayer - 1];
      ({ squareCompleted, squares } = updateSquares([lineI, lineJ], "v", gameState));
      // if (!squareCompleted && !squareCompletedLastTurn) {
      //   currentPlayer = currentPlayer === 1 ? 2 : 1;
      // }
    }
  }
  return {
    squareCompleted,
    updatedGameState: {
      hlines: [...hlines],
      vlines: [...vlines],
      gridSize,
      currentPlayer,
      squares: squares as any,
    }
  }
}