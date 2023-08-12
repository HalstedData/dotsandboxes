

class Game {
    constructor({
      hlines = Array.from({ length: gridSize + 1 }, () =>
        Array.from({ length: gridSize }, () => null)
      ),
      vlines = Array.from({ length: gridSize }, () =>
       Array.from({ length: gridSize + 1 }, () => null)
      ),
      gridSize
    }) {
      this.currentPlayer = 1;
      this.hlines = hlines;
      this.vlines = vlines;
      this.gridSize = gridSize;
      this.squares = Array.from({ length: gridSize }, () =>
        Array.from({ length: gridSize }, () => 0)
      );
      this.squareCounter = 1;
      this.gameOver = false;
      this.humanTurn = humanTurn;
      this.gameEndTimer = null;
      this.squareCompletedLastTurn = false;
      this.boxSize = (SCREEN_SIZE - 40) / gridSize;
      this.numstring = Array(gridSize ** 2).fill(0);
      this.waiting = false;
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
  
  
  
    checkSquareCompletionH(i, j) {
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
  
    checkSquareCompletionV(i, j) {
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
  
    updateSquares(line, lineType) {
      const [lineI, lineJ] = line;
      let squareCompleted = false;
      if (lineType === "h") {
        squareCompleted = this.checkSquareCompletionH(lineI, lineJ);
      } else if (lineType === "v") {
        squareCompleted = this.checkSquareCompletionV(lineI, lineJ);
      }
      return squareCompleted;
    }
  
    getAvailableLines() {
      const availableLines = [];
      for (let i = 0; i < this.gridSize + 1; i++) {
        for (let j = 0; j < this.gridSize; j++) {
          if (!this.hlines[i][j]) {
            availableLines.push(["h", i, j]);
          }
        }
      }
      for (let i = 0; i < this.gridSize; i++) {
        for (let j = 0; j < this.gridSize + 1; j++) {
          if (!this.vlines[i][j]) {
            availableLines.push(["v", i, j]);
          }
        }
      }
      return availableLines;
    }
  
    updateNumstring() {
      for (let i = 0; i < this.gridSize; i++) {
        for (let j = 0; j < this.gridSize; j++) {
          const top = Number(this.hlines[i][j] !== null);
          const bottom = Number(this.hlines[i + 1][j] !== null);
          const left = Number(this.vlines[i][j] !== null);
          const right = Number(this.vlines[i][j + 1] !== null);
          this.numstring[i * GRID_SIZE + j] = top + bottom + left + right;
        }
      }
    }
    generateOptimalMove() {
      this.updateNumstring();
      const availableLines = this.getAvailableLines();
      const optimalMoves = [];
      const riskyMoves = [];
  
      for (const move of availableLines) {
        const [lineType, lineI, lineJ] = move;
  
        if (lineType === "h") {
          this.hlines[lineI][lineJ] = PLAYER_COLORS[this.currentPlayer - 1];
        } else if (lineType === "v") {
          this.vlines[lineI][lineJ] = PLAYER_COLORS[this.currentPlayer - 1];
        }
  
        const squareCompleted = this.updateSquares([lineI, lineJ], lineType);
        this.updateNumstring();
  
        if (squareCompleted) {
          optimalMoves.push(move);
        } else if (this.numstring.includes(3)) {
          riskyMoves.push(move);
        }
  
        if (lineType === "h") {
          this.hlines[lineI][lineJ] = null;
        } else if (lineType === "v") {
          this.vlines[lineI][lineJ] = null;
        }
      }
  
      if (optimalMoves.length > 0) {
        return optimalMoves;
      }
  
      return availableLines.filter((move) => !riskyMoves.includes(move));
    }
  
  
  
    getChosenMove() {
      const availableLines = this.getAvailableLines();
      const optimalMoves = this.generateOptimalMove();
  
      let chosenMove;
      if (optimalMoves.length > 0) {
        chosenMove = optimalMoves[Math.floor(Math.random() * optimalMoves.length)];
      } else {
        chosenMove = availableLines[Math.floor(Math.random() * availableLines.length)];
      }
      return chosenMove;
    }
  
  }