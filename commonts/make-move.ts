import { ClientGameV2, GameStateV2, GameV2, Line } from "./types";

const SCREEN_SIZE = 600;

function checkSquareCompletionH(i: number, j: number, { state, meta}: GameV2) {
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
  return {
    squareCompleted,
    squares,
  };
}

function checkSquareCompletionV(i: number, j: number, { state, meta }: GameV2) {
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
  return {
    squareCompleted,
    squares,
  };
}

export function updateSquares(line: Line, game: GameV2) {
  const [lineType, lineI, lineJ] = line;
  let squareCompleted = false;
  let squares;
  if (lineType === "h") {
    ({ squareCompleted, squares } = checkSquareCompletionH(lineI, lineJ, game));
  } else if (lineType === "v") {
    ({ squareCompleted, squares } = checkSquareCompletionV(lineI, lineJ, game));
  }

  // console.log('current board', JSON.stringify({ verticalLines: vlines, horizontalLines: hlines }, null, 2));
  return {
    squareCompleted,
    squares: squares as GameStateV2["squares"]
  };
}

// type UpdateResponse = {
//   GameStateV2Updates: Partial<GameStateV2>,
// }

// export function applyStateUpdatesToGameV2(game: GameV2, stateUpdates: UpdateResponse): GameV2 {
//   if (!Object.values(stateUpdates).length) return game;
//   console.log('updaitng game state', stateUpdates)
//   const nextGameStateV2 = {
//     ...game.state,
//     ...stateUpdates
//   };
//   return {
//     meta: game.meta,
//     state: nextGameStateV2,
//   };
// }

// export function applyMove(move: Move, game: GameV2): GameV2 {
//   const [playerId, ...line] = move;
//   return {
//     meta: {
//       ...game.meta,
//       moveOrder: [
//         ...game.meta.moveOrder,
//         move,
//       ]
//     },
//     state: 
//   }
// }

export function applyLine<T extends GameV2>(line: Line, game: T): T {
  const { state, meta } = game;
  const { hlines, vlines, currentPlayer } = state;
  const { playerStrings, gridSize } = meta;
  const GameStateV2Updates: Partial<GameStateV2> = {};
  let squareCompleted = false;
  let squares;
  const [minType, lineI, lineJ] = line;
  const curPlayerIndex = playerStrings.indexOf(currentPlayer);
  if (minType === "h") {
    hlines[lineI][lineJ] = currentPlayer;
    GameStateV2Updates.hlines = hlines;
    ({ squareCompleted, squares } = updateSquares(["h", lineI, lineJ], game));
  } else if (minType === "v") {
    vlines[lineI][lineJ] = currentPlayer;
    GameStateV2Updates.vlines = vlines;
    ({ squareCompleted, squares } = updateSquares(["v", lineI, lineJ], game));
  }
  console.log('cur', currentPlayer, 'next', playerStrings[curPlayerIndex === playerStrings.length - 1 ? 0 : curPlayerIndex + 1], 'squareCompleted', squareCompleted);

  const stateUpdates = {
    ...GameStateV2Updates,
    ...squareCompleted ? {
      squares: squares as GameStateV2["squares"],
      isGameOver: (() => {
        for (let i = 0; i < gridSize; i++) {
          for (let j = 0; j < gridSize; j++) {
            if ((squares as GameStateV2["squares"])[i][j] === null) {
              return false;
            }
          }
        }
        return true;
      })(),
    } : {
      currentPlayer: playerStrings[curPlayerIndex === playerStrings.length - 1 ? 0 : curPlayerIndex + 1],
    }
  };
  return {
    meta: {
      ...meta,
      moveOrder: [
        ...meta.moveOrder,
        [state.currentPlayer, ...line]
      ]
    },
    state: {
      ...state,
      ...stateUpdates,
    }
  } as T;
}

export function getLineFromXY(x: number, y: number, { state, meta }: ClientGameV2): Line | null {
  const { hlines, vlines } = state;
  const { gridSize } = meta;
  const boxSize = (SCREEN_SIZE - 40) / gridSize;

  let minDistance = Infinity;
  let minLine: Line | null = null;
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
        minLine = ["h", i, j];
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
        minLine = ["v", i, j];
      }
    }
  }
  return minLine || null;
}

// export function makeMoveFromXY(x: number, y: number, clientGame: ClientGameV2): UpdateResponse & { move?: Line } {
//   const line = getLineFromXY(x, y, clientGame);
//   if (!line) return { GameStateV2Updates: {} };
//   const move = [fullGame.state.currentPlayer, ...line];
//   console.log(JSON.stringify({ x, y, move }))
//   return move ? { ...applyLine(move, clientGame), move } : { GameStateV2Updates: {} };
// }


