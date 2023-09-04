import { ClientGameV2 } from "../../commonts/types";

// CONSTANTS
const LINE_THICKNESS = 5;
// const SCREEN_SIZE = 600;
const DOT_RADIUS = 7;
const SCORE_AREA_HEIGHT = 100;
// const WINDOW_SIZE = SCREEN_SIZE + SCORE_AREA_HEIGHT;

const WHITE = "#ffffff";
const RED = "#ff0000";
const BLUE = "#0000ff";
const BLACK = "#000000";
const LIGHT_GRAY = "#cccccc";
const PLAYER_COLORS = [RED, BLUE];



export function fillBoxes(context: CanvasRenderingContext2D, { state, meta }: ClientGameV2) {
  const { squares, } = state;
  const { gridSize, width } = meta;
  const boxSize = (width - 40) / gridSize;
  const boxInnerMargin = 10;
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const curSquare = squares[i][j];
      if (curSquare !== null) {
        context.fillStyle = PLAYER_COLORS[meta.players.findIndex(player => player.userID === curSquare)];
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
export function drawLines(context: CanvasRenderingContext2D, { state, meta }: ClientGameV2) {
  const { hlines, vlines, } = state;
  const { gridSize, width } = meta;
  const boxSize = (width - 40) / gridSize;
  context.lineWidth = LINE_THICKNESS;
  for (let i = 0; i < gridSize + 1; i++) {
    for (let j = 0; j < gridSize; j++) {
      const curSquare = hlines[i][j];
      const color = curSquare ? PLAYER_COLORS[meta.players.findIndex(player => player.userID === curSquare)] : LIGHT_GRAY;
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
        const curSquare = vlines[i][j];
        const color = curSquare ? PLAYER_COLORS[meta.players.findIndex(player => player.userID === curSquare)] : LIGHT_GRAY;
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

export function displayScores(context: CanvasRenderingContext2D, { state, meta }: ClientGameV2) {
  const { squares } = state;
  const { myPlayerId, players, width } = meta;


  const scoreByUserID = players
    .map(player => player.userID)
    .reduce((acc, userID) => ({
      ...acc,
      [userID]: squares.flat().filter((s) => s === userID).length
    }), {} as Record<string, number>);

  const youScore = scoreByUserID[myPlayerId];
  const [opponentUserID, opponentScore] = Object.entries(scoreByUserID).find(([compareID, score]) => compareID !== myPlayerId) || [];

  context.font = "bold 24px sans-serif";
  context.fillStyle = BLACK;

  context.fillRect(0, width, width, SCORE_AREA_HEIGHT);

  context.fillStyle = WHITE;
  context.globalAlpha = 0.7;
  context.fillRect(0, width, width, SCORE_AREA_HEIGHT);
  context.globalAlpha = 1;

  context.fillStyle = BLACK;
  context.fillText(
    `You: ${youScore}`,
    20,
    width + SCORE_AREA_HEIGHT / 2 - 10
  );

  context.fillText(
    `${opponentUserID}: ${opponentScore}`,
    20,
    width + SCORE_AREA_HEIGHT / 2 + 30
  );
}

export default function drawBoard(canvas: HTMLCanvasElement, clientGame: ClientGameV2) {
  const context = canvas.getContext("2d");
  if (!context) throw "No context what?";

  context.fillStyle = WHITE;
  context.fillRect(0, 0, clientGame.meta.width, clientGame.meta.width + SCORE_AREA_HEIGHT);
  fillBoxes(context, clientGame);
  drawLines(context, clientGame);
  displayScores(context, clientGame);
}