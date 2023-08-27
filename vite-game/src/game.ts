// Constants
// require('regenerator-runtime/runtime');

const LINE_THICKNESS = 5;
const DOT_RADIUS = 7;
const SCREEN_SIZE = 600;
const SCORE_AREA_HEIGHT = 100;
const WINDOW_SIZE = SCREEN_SIZE + SCORE_AREA_HEIGHT;

const WHITE = "#ffffff";
const RED = "#ff0000";
const BLUE = "#0000ff";
const BLACK = "#000000";
const LIGHT_GRAY = "#cccccc";

const PLAYER_COLORS = [RED, BLUE];


type LineArray<T = string | null> = T[][];

type Line = ['h' | 'v', number, number];

interface IGame {
  getComputerMove: () => Promise<Line>;
} 

class Game implements IGame {

  gridSize: number;
  currentPlayer: number;
  hlines: LineArray;
  vlines: LineArray;
  squares: LineArray<number>;
  gameOver: boolean;
  humanTurn: boolean;
  squareCompletedLastTurn: boolean;
  boxSize: number;
  numstring: any[];
  waiting: boolean;
  hoverLine: Line | null;

  constructor(gridSize = 3) {
    this.currentPlayer = 1;
    this.gridSize = gridSize;
    this.hlines = Array.from({ length: this.gridSize + 1 }, () =>
      Array.from({ length: gridSize }, () => null)
    );
    this.vlines = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize + 1 }, () => null)
    );
    this.squares = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => 0)
    );
    this.gameOver = false;
    this.humanTurn = true;
    this.squareCompletedLastTurn = false;
    this.boxSize = (SCREEN_SIZE - 40) / this.gridSize;
    this.numstring = Array(this.gridSize ** 2).fill(0);
    this.waiting = false;
    this.hoverLine = null;
  }

  isGameOver() {
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (this.squares[i][j] === 0) {
          return false;
        }
      }
    }
    return true;
  }

  getNearestLine(x: number, y: number): Line | null {

    let minDistance = Infinity;
    let minLine = null;
    let minType = null;

    for (let i = 0; i < this.gridSize + 1; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const midH = [j * this.boxSize + this.boxSize / 2, i * this.boxSize];
        const distanceH = Math.hypot(midH[0] - x, midH[1] - y);
        if (
          j < this.gridSize &&
          !this.hlines[i][j] &&
          distanceH < minDistance
        ) {
          minDistance = distanceH;
          minLine = [i, j];
          minType = "h";
        }
      }

      for (let j = 0; j < this.gridSize + 1; j++) {
        const midV = [j * this.boxSize, i * this.boxSize + this.boxSize / 2];
        const distanceV = Math.hypot(midV[0] - x, midV[1] - y);
        if (
          i < this.gridSize &&
          !this.vlines[i][j] &&
          distanceV < minDistance
        ) {
          minDistance = distanceV;
          minLine = [i, j];
          minType = "v";
        }
      }
    }
    return minType && minLine ? [minType, ...minLine] as Line : null;
  }
  updateHoverLine(x: number, y: number) {
    const nearestLine = this.getNearestLine(x, y);
    // const [minType, lineI, lineJ] = nearestLine;
    this.hoverLine = nearestLine;
  }

  updateLine(x: number, y: number) {
    const nearestLine = this.getNearestLine(x, y);
    if (nearestLine !== null) {
      const [minType, lineI, lineJ] = nearestLine;
      if (minType === "h") {
        this.hlines[lineI][lineJ] = PLAYER_COLORS[this.currentPlayer - 1];
        const squareCompleted = this.updateSquares(["h", lineI, lineJ]);
        if (!squareCompleted && !this.squareCompletedLastTurn) {
          this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
          this.humanTurn = !this.humanTurn;
        }
      } else if (minType === "v") {
        this.vlines[lineI][lineJ] = PLAYER_COLORS[this.currentPlayer - 1];
        const squareCompleted = this.updateSquares(["v", lineI, lineJ]);
        if (!squareCompleted && !this.squareCompletedLastTurn) {
          this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
          this.humanTurn = !this.humanTurn;
        }
      }
    }
  }

  checkSquareCompletionH(i: number, j: number) {
    let squareCompleted = false;
    if (
      i > 0 &&
      this.vlines[i - 1][j] !== null &&
      this.vlines[i - 1][j + 1] !== null &&
      this.hlines[i - 1][j] !== null
    ) {
      this.squares[i - 1][j] = this.currentPlayer;
      squareCompleted = true;
    }
    if (
      i < this.gridSize &&
      this.vlines[i][j] !== null &&
      this.vlines[i][j + 1] !== null &&
      this.hlines[i + 1][j] !== null
    ) {
      this.squares[i][j] = this.currentPlayer;
      squareCompleted = true;
    }
    return squareCompleted;
  }

  checkSquareCompletionV(i: number, j: number) {
    let squareCompleted = false;
    if (
      j > 0 &&
      this.hlines[i][j - 1] !== null &&
      this.hlines[i + 1][j - 1] !== null &&
      this.vlines[i][j - 1] !== null
    ) {
      this.squares[i][j - 1] = this.currentPlayer;
      squareCompleted = true;
    }
    if (
      j < this.gridSize &&
      this.hlines[i][j] !== null &&
      this.hlines[i + 1][j] !== null &&
      this.vlines[i][j + 1] !== null
    ) {
      this.squares[i][j] = this.currentPlayer;
      squareCompleted = true;
    }
    return squareCompleted;
  }

  updateSquares(line: Line) {
    const [lineType, lineI, lineJ] = line;
    let squareCompleted = false;
    if (lineType === "h") {
      squareCompleted = this.checkSquareCompletionH(lineI, lineJ);
    } else if (lineType === "v") {
      squareCompleted = this.checkSquareCompletionV(lineI, lineJ);
    }

    console.log('current board', JSON.stringify({ verticalLines: this.vlines, horizontalLines: this.hlines }, null, 2));
    return squareCompleted;
  }

  fillBoxes(context: CanvasRenderingContext2D) {
    const boxInnerMargin = 10;
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (this.squares[i][j] !== 0) {
          context.fillStyle = PLAYER_COLORS[this.squares[i][j] - 1];
          context.fillRect(
            20 + j * this.boxSize + LINE_THICKNESS / 2 + boxInnerMargin,
            20 + i * this.boxSize + LINE_THICKNESS / 2 + boxInnerMargin,
            this.boxSize - LINE_THICKNESS - 2 * boxInnerMargin,
            this.boxSize - LINE_THICKNESS - 2 * boxInnerMargin
          );
        }
      }
    }
  }

  drawLines(context: CanvasRenderingContext2D) {
    this.fillBoxes(context);
    context.lineWidth = LINE_THICKNESS;
    for (let i = 0; i < this.gridSize + 1; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const isHoverLine = JSON.stringify(this.hoverLine) === JSON.stringify(["h", i, j]) && !this.hlines[i][j];
        const color = this.hlines[i][j] || (isHoverLine && 'orange') || LIGHT_GRAY;
        if (isHoverLine) {
          context.globalAlpha = 0.4;
        }
        context.strokeStyle = color;

        // context.lineWidth = JSON.stringify(this.lastComputerLine) === JSON.stringify(["h", i, j]) ? 20 : 10;
        context.beginPath();
        context.moveTo(20 + j * this.boxSize, 20 + i * this.boxSize);
        context.lineTo(20 + (j + 1) * this.boxSize, 20 + i * this.boxSize);
        context.stroke();
        if (isHoverLine) {
          context.globalAlpha = 1;
        }
      }
    }

    for (let i = 0; i < this.gridSize + 1; i++) {
      for (let j = 0; j < this.gridSize + 1; j++) {
        if (i < this.gridSize) {
          const isHoverLine = JSON.stringify(this.hoverLine) === JSON.stringify(["v", i, j]) && !this.vlines[i][j];
          const color = this.vlines[i][j] || (isHoverLine && 'orange') || LIGHT_GRAY;
          context.strokeStyle = color;
          if (isHoverLine) {
            context.globalAlpha = 0.4;
          }
          // const lineWidth = isHoverLine ? 20 : 10;
          // context.lineWidth = lineWidth;
          context.beginPath();
          context.moveTo(20 + j * this.boxSize, 20 + i * this.boxSize);
          context.lineTo(20 + j * this.boxSize, 20 + (i + 1) * this.boxSize);
          context.stroke();
          if (isHoverLine) {
            context.globalAlpha = 1;
          }
        }
        context.fillStyle = BLACK;
        context.beginPath();
        context.arc(
          20 + j * this.boxSize,
          20 + i * this.boxSize,
          DOT_RADIUS,
          0,
          2 * Math.PI
        );
        context.fill();
      }
    }
  }

  displayScores(context: CanvasRenderingContext2D) {
    const player1Score = this.squares.flat().filter((s) => s === 1).length;
    const player2Score = this.squares.flat().filter((s) => s === 2).length;

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

    context.fillText(
      `Computer: ${player2Score}`,
      20,
      SCREEN_SIZE + SCORE_AREA_HEIGHT / 2 + 30
    );
    const allLines = [...this.hlines, ...this.vlines].flat();
    const noMovesPlayed = !allLines.filter(Boolean).length;
    if (!noMovesPlayed) {
      gameStatusH2!.textContent = this.humanTurn ? 'Your turn' : 'Computer turn';
    }
  }

  getAvailableLines(): Line[] {
    const availableLines = [];
    for (let i = 0; i < this.gridSize + 1; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (!this.hlines[i][j]) {
          availableLines.push(["h", i, j] as Line);
        }
      }
    }
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize + 1; j++) {
        if (!this.vlines[i][j]) {
          availableLines.push(["v", i, j] as Line);
        }
      }
    }
    return availableLines;
  }

  async getComputerMove(): Promise<Line> {

    const data = {
      hlines: this.hlines,
      vlines: this.vlines,
      gridSize: this.gridSize
    };

    console.log({})

    const { host } = window.location;
    const inDevMode = !host || host && ['127.0.0.1', 'localhost'].some(h => host.includes(h));
    const requestHost = inDevMode && true ? 'http://127.0.0.1:5000' : 'https://chiefsmurph.com/dotsandboxes';

    const response = await fetch(
      `${requestHost}/get-computer-move`,
      {
        method: 'POST',
        mode: 'cors', // no-cors, *cors, same-origin
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    ).then(r => r.json());

    return response.computer_move as Line;
  }


  async computerTurn() {
    this.waiting = true;
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.random()));
    this.squareCompletedLastTurn = false;
    let squareCompleted = true;
    while (squareCompleted && this.getAvailableLines().length > 0) {
      squareCompleted = false;

      const chosenMove = await this.getComputerMove();
      const [lineType, lineI, lineJ] = chosenMove;

      if (lineType === "h") {
        this.hlines[lineI][lineJ] = PLAYER_COLORS[this.currentPlayer - 1];
      } else if (lineType === "v") {
        this.vlines[lineI][lineJ] = PLAYER_COLORS[this.currentPlayer - 1];
      }

      squareCompleted = this.updateSquares([lineType, lineI, lineJ]);
      await new Promise(resolve => setTimeout(resolve, 2000 * Math.random()));
    }

    if (!squareCompleted && !this.squareCompletedLastTurn) {
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
      this.humanTurn = true;
    }
    this.waiting = false;
  }

}


// Game initialization
let game: Game | null = null;
let canvas: HTMLCanvasElement | null = null;
let context: CanvasRenderingContext2D | null = null;
let gameResultDiv: HTMLElement | null = null;
let gameStatusH2: HTMLElement | null = null;

// Game initialization
function initializeGame(gridSize: number, humanTurn: boolean) {
  game = new Game(gridSize);
  canvas = <HTMLCanvasElement>document.getElementById("game-canvas");
  if (!canvas) {
    throw new Error('canvas not accessible');
  }
  context = canvas.getContext("2d");
  gameResultDiv = document.getElementById("game-result");
  gameStatusH2 = document.getElementById("game-status");

  // Set the canvas drawing surface size
  canvas.width = WINDOW_SIZE - SCORE_AREA_HEIGHT;
  canvas.height = WINDOW_SIZE;

  // Set the canvas display size
  canvas.style.width = `${WINDOW_SIZE - SCORE_AREA_HEIGHT}px`;
  canvas.style.height = `${WINDOW_SIZE}px`;

  // Show the game section and hide the options section
  document.getElementById("options")!.style.display = "none";
  document.getElementById("game-section")!.style.display = "block";
  gameStatusH2!.textContent = `Game on! ${humanTurn ? 'You start' : 'Computer starts!'}`;

  // Add event listener for canvas click
  canvas.addEventListener("click", handleCanvasClick);
  canvas.addEventListener("mousemove", handleCanvasMouseMove);
  canvas.addEventListener("mouseout", () => {
    game && (game.hoverLine = null);
  });

  // Start the game loop
  gameLoop();
}

// Start the game loop
function gameLoop() {
  if (!game || !context || !canvas) {
    return;
  }
  context.fillStyle = WHITE;
  context.fillRect(0, 0, WINDOW_SIZE, WINDOW_SIZE);
  game.drawLines(context);
  game.displayScores(context);

  if (game.isGameOver()) {
    game.gameOver = true;
    canvas.style.cursor = "default";
    gameStatusH2!.textContent = '';

    // Determine the winner and update the game result div
    let message = "";
    const player1Score = game.squares.flat().filter((s) => s === 1).length;
    const player2Score = game.squares.flat().filter((s) => s === 2).length;

    if (player1Score > player2Score) {
      message = "YOU WON!";
    } else if (player1Score < player2Score) {
      message = "YOU SUCK";
    } else {
      message = "It's a tie!";
    }

    gameStatusH2!.textContent = message;
    // gameResultDiv.textContent = message;

    return;
  } else {
    if (game.humanTurn) {
      // Human player's turn
      canvas.style.cursor = "pointer";
    } else {
      // Computer player's turn
      canvas.style.cursor = "default";
      !game.waiting && game.computerTurn();
    }
  }

  requestAnimationFrame(gameLoop);
}

// Event handlers
function handleCanvasMouseMove(event: { clientX: number; clientY: number; }) {
  if (!game || game.waiting || !canvas) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  console.log({ x, y })
  game.updateHoverLine(x, y);
}

// Event handlers
function handleCanvasClick(event: { clientX: number; clientY: number; }) {
  if (!game || game.waiting || !canvas) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  game.updateLine(x, y);
}

export function startGame() {
  const gridSize = parseInt((<HTMLSelectElement>document.getElementById("grid-size")).value);
  const humanTurn = true; // Set the initial turn for the human player
  initializeGame(gridSize, humanTurn);
  document.getElementById("options")!.style.display = "none"; // Hide the options section
  document.getElementById("game-section")!.style.display = "block"; // Show the game section
}

function resetGame() {
  startGame();
  gameResultDiv!.textContent = "";  // Clear the game result message
}

function goHome() {
  document.getElementById("game-section")!.style.display = "none";
  document.getElementById("options")!.style.display = "block";
}

export function setupGame() {

  // event handlers
  document.getElementById("start-button")!.addEventListener("click", startGame);
  document.getElementById("reset-game")!.addEventListener("click", resetGame);
  document.getElementById("go-home")!.addEventListener("click", goHome);

};