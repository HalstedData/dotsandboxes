import { Line, GameState } from "./Game";

const SCREEN_SIZE = 600;
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

export function updateSquares(move: Line, gameState: GameState) {
  const [lineType, lineI, lineJ] = move;
  let squareCompleted = false;
  let squares;
  if (lineType === "h") {
    ({ squareCompleted, squares } = checkSquareCompletionH(lineI, lineJ, gameState));
  } else if (lineType === "v") {
    ({ squareCompleted, squares } = checkSquareCompletionV(lineI, lineJ, gameState));
  }

  // console.log('current board', JSON.stringify({ verticalLines: vlines, horizontalLines: hlines }, null, 2));
  return {
    squareCompleted,
    squares: squares as GameState["squares"]
  };
}

type UpdateResponse = {
  gameStateUpdates: Partial<GameState>,
}

export function makeMove(move: Line, gameState: GameState): UpdateResponse {
  const { hlines, vlines, currentPlayer, gridSize } = gameState;
  const gameStateUpdates: Partial<GameState> = {};
  let squareCompleted = false;
  let squares;
  const [minType, lineI, lineJ] = move;
  if (minType === "h") {
    hlines[lineI][lineJ] = PLAYER_COLORS[currentPlayer - 1];
    gameStateUpdates.hlines = hlines;
    ({ squareCompleted, squares } = updateSquares(["h", lineI, lineJ], gameState));
  } else if (minType === "v") {
    vlines[lineI][lineJ] = PLAYER_COLORS[currentPlayer - 1];
    gameStateUpdates.vlines = vlines;
    ({ squareCompleted, squares } = updateSquares(["v", lineI, lineJ], gameState));
  }
  return {
    gameStateUpdates: {
      ...gameStateUpdates,
      ...squareCompleted ? {
        squares: squares as GameState["squares"],
        isGameOver: (() => {
          for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
              if ((squares as GameState["squares"])[i][j] === 0) {
                return false;
              }
            }
          }
          return true;
        })(),
      } : {
        currentPlayer: currentPlayer === 1 ? 2 : 1,
      }
    }
  }
}

export function getMoveFromXY(x: number, y: number, gameState: GameState): Line | null {
  const { gridSize, hlines, vlines } = gameState;
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
        minType = "h" as Line[0];
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
        minType = "v" as Line[0];
      }
    }
  }
  return minLine && minType ? [minType, minLine[0], minLine[1]] : null;
}

export function makeMoveFromXY(x: number, y: number, gameState: GameState): UpdateResponse {
  const move = getMoveFromXY(x, y, gameState);
  return move ? makeMove(move, gameState) : { gameStateUpdates: {} };
}


