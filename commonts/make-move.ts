import { ClientGameV2, GameV2State, GameV2, GameV2Meta, Line } from "./types";

function checkSquareCompletionH(i: number, j: number, { state, meta }: GameV2): Partial<GameV2State> | undefined {
  const { hlines, vlines, squares, currentPlayer } = state;
  const { gridSize } = meta;
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
  return squareCompleted ? {
    squares,
  } : undefined;
}

function checkSquareCompletionV(i: number, j: number, { state, meta }: GameV2): Partial<GameV2State> | undefined {
  const { hlines, vlines, squares, currentPlayer } = state;
  const { gridSize } = meta;
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
  return squareCompleted ? {
    squares,
  } : undefined;
}

export function updateSquares(line: Line, game: GameV2): Partial<GameV2State> | undefined {
  const [lineType, lineI, lineJ] = line;
  if (lineType === "h") {
    return checkSquareCompletionH(lineI, lineJ, game);
  } else {  // linetype === v
    return checkSquareCompletionV(lineI, lineJ, game);
  }
}

export function applyLine<T extends GameV2>(line: Line, game: T): T {
  const { state, meta } = game;
  const { hlines, vlines, currentPlayer } = state;
  const { players, gridSize } = meta;

  const gameStateUpdates: Partial<GameV2State> = {};
  const gameMetaUpdates: Partial<GameV2Meta> = {
    moveOrder: [
      ...meta.moveOrder,
      [state.currentPlayer, ...line]
    ]
  };

  const [minType, lineI, lineJ] = line;
  const curPlayerIndex = players.findIndex(player => player.username === currentPlayer);
  if (minType === "h") {
    hlines[lineI][lineJ] = currentPlayer;
    gameStateUpdates.hlines = hlines;
    Object.assign(gameStateUpdates, updateSquares(["h", lineI, lineJ], game));
  } else if (minType === "v") {
    vlines[lineI][lineJ] = currentPlayer;
    gameStateUpdates.vlines = vlines;
    Object.assign(gameStateUpdates, updateSquares(["v", lineI, lineJ], game));
  }

  if (gameStateUpdates.squares) {
    const squareCounts: Record<string, number> = {};
    const isGameOver = (() => {
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const squareValue = (gameStateUpdates.squares)[i][j];
          if (squareValue === null) {
            return false;
          }
          squareCounts[squareValue] = (squareCounts[squareValue] || 0) + 1;
        }
      }
      return true;
    })();
    if (isGameOver) {
      console.log('isGaveOver detected winnerUsername', currentPlayer);
      gameStateUpdates.isGameOver = true;
      gameMetaUpdates.winnerUsername = Object.entries(squareCounts)
        .map(([username, squareCount]) => ({
          username,
          squareCount
        }))
        .sort((a, b) => b.squareCount - a.squareCount)
        .shift()?.username;
    }
  } else {
    gameStateUpdates.currentPlayer = (players[curPlayerIndex === players.length - 1 ? 0 : curPlayerIndex + 1]).username;
  }

  return {
    meta: {
      ...meta,
      ...gameMetaUpdates,
    },
    state: {
      ...state,
      ...gameStateUpdates,
    }
  } as T;
}

export function getLineFromXY(x: number, y: number, { state, meta }: ClientGameV2): Line | null {
  const { hlines, vlines } = state;
  const { gridSize, width } = meta;
  const boxSize = (width - 40) / gridSize;

  let minDistance = Infinity;
  let minLine: Line | null = null;
  for (let i = 0; i < gridSize + 1; i++) {
    for (let j = 0; j < gridSize; j++) {
      const midH = [20 + j * boxSize + boxSize / 2, 20 + i * boxSize]; // Include the offset
      const distanceH = Math.hypot(midH[0] - x, midH[1] - y);
      if (
        j < gridSize &&
        !hlines[i][j] &&
        distanceH < minDistance
      ) {
        minDistance = distanceH;
        minLine = ["h", i, j];
      }
    }

    for (let j = 0; j < gridSize + 1; j++) {
      const midV = [20 + j * boxSize, 20 + i * boxSize + boxSize / 2]; // Include the offset
      const distanceV = Math.hypot(midV[0] - x, midV[1] - y);
      if (
        i < gridSize &&
        !vlines[i][j] &&
        distanceV < minDistance
      ) {
        minDistance = distanceV;
        minLine = ["v", i, j];
      }
    }
  }
  return minLine || null;
}