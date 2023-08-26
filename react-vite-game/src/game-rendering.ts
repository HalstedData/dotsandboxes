import { GameState } from "./Game";

// CONSTANTS
const LINE_THICKNESS = 5;
const SCREEN_SIZE = 600;
const DOT_RADIUS = 7;
const SCORE_AREA_HEIGHT = 100;
const WINDOW_SIZE = SCREEN_SIZE + SCORE_AREA_HEIGHT;

const WHITE = "#ffffff";
const RED = "#ff0000";
const BLUE = "#0000ff";
const BLACK = "#000000";
const LIGHT_GRAY = "#cccccc";
const PLAYER_COLORS = [RED, BLUE];



export function fillBoxes(context: CanvasRenderingContext2D, gameState: GameState) {
  const { gridSize, squares, } = gameState;
  const boxSize = (SCREEN_SIZE - 40) / gridSize;
  const boxInnerMargin = 10;
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (squares[i][j] !== 0) {
        context.fillStyle = PLAYER_COLORS[squares[i][j] - 1];
        context.fillRect(
          20 + j * boxSize + LINE_THICKNESS / 2 + boxInnerMargin,
          20 + i * boxSize + LINE_THICKNESS / 2 + boxInnerMargin,
          boxSize - LINE_THICKNESS - 2 * boxInnerMargin,
          boxSize - LINE_THICKNESS - 2 * boxInnerMargin
        );
      }
    }
  }
}


export function drawLines(context: CanvasRenderingContext2D, gameState: GameState) {
  fillBoxes(context, gameState);
  const { gridSize, hlines, vlines, } = gameState;
  const boxSize = (SCREEN_SIZE - 40) / gridSize;
  context.lineWidth = LINE_THICKNESS;
  for (let i = 0; i < gridSize + 1; i++) {
    for (let j = 0; j < gridSize; j++) {
      const color = hlines[i][j] || LIGHT_GRAY;
      context.strokeStyle = color;
      context.beginPath();
      context.moveTo(20 + j * boxSize, 20 + i * boxSize);
      context.lineTo(20 + (j + 1) * boxSize, 20 + i * boxSize);
      context.stroke();
    }
  }

  for (let i = 0; i < gridSize + 1; i++) {
    for (let j = 0; j < gridSize + 1; j++) {
      if (i < gridSize) {
        const color = vlines[i][j] || LIGHT_GRAY;
        context.strokeStyle = color;
        context.beginPath();
        context.moveTo(20 + j * boxSize, 20 + i * boxSize);
        context.lineTo(20 + j * boxSize, 20 + (i + 1) * boxSize);
        context.stroke();
      }
      context.fillStyle = BLACK;
      context.beginPath();
      context.arc(
        20 + j * boxSize,
        20 + i * boxSize,
        DOT_RADIUS,
        0,
        2 * Math.PI
      );
      context.fill();
    }
  }
}

export function displayScores(context: CanvasRenderingContext2D, gameState: GameState) {
  const { squares } = gameState;
  const player1Score = squares.flat().filter((s) => s === 1).length;
  const player2Score = squares.flat().filter((s) => s === 2).length;

  context.font = "bold 24px sans-serif";
  context.fillStyle = BLACK;

  context.fillRect(0, SCREEN_SIZE, SCREEN_SIZE, SCORE_AREA_HEIGHT);

  context.fillStyle = WHITE;
  context.globalAlpha = 0.7;
  context.fillRect(0, SCREEN_SIZE, SCREEN_SIZE, SCORE_AREA_HEIGHT);
  context.globalAlpha = 1;

  context.fillStyle = BLACK;
  context.fillText(
    `You: ${player1Score}`,
    20,
    SCREEN_SIZE + SCORE_AREA_HEIGHT / 2 - 10
  );

  const opponentString = gameState.opponent === "computer" ? "Computer" : "Opponent";
  context.fillText(
    `${opponentString}: ${player2Score}`,
    20,
    SCREEN_SIZE + SCORE_AREA_HEIGHT / 2 + 30
  );
  // const allLines = [...hlines, ...vlines].flat();
  // const noMovesPlayed = !allLines.filter(Boolean).length;
  // if (!noMovesPlayed) {
  //   gameStatusH2!.textContent = humanTurn ? 'Your turn' : 'Computer turn';
  // }
}

export default function drawBoard(canvas: HTMLCanvasElement, gameState: GameState) {
  const context = canvas.getContext("2d");
  if (!context) throw "No context what?";

  context.fillStyle = WHITE;
  context.fillRect(0, 0, WINDOW_SIZE, WINDOW_SIZE);
  drawLines(context, gameState);
  displayScores(context, gameState);
}