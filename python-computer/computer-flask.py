import random
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

class Game:
    def __init__(self, hlines=None, vlines=None, gridSize=3):
        if hlines is None:
            hlines = [[None] * gridSize for _ in range(gridSize + 1)]
        if vlines is None:
            vlines = [[None] * (gridSize + 1) for _ in range(gridSize)]

        self.currentPlayer = 1
        self.hlines = hlines
        self.vlines = vlines
        self.gridSize = gridSize
        self.squares = [[0] * gridSize for _ in range(gridSize)]
        self.squareCounter = 1
        self.gameOver = False
        self.gameEndTimer = None
        self.squareCompletedLastTurn = False
        self.numstring = [0] * (gridSize ** 2)
        self.waiting = False

        self.RED = "#ff0000"
        self.BLUE = "#0000ff"
        self.BLACK = "#000000"
        self.LIGHT_GRAY = "#cccccc"
        self.PLAYER_COLORS = [self.RED, self.BLUE]

    def evaluateMove(self, line_type, line_i, line_j):
        if line_type == 'h':
            self.hlines[line_i][line_j] = self.PLAYER_COLORS[self.currentPlayer - 1]
        elif line_type == 'v':
            self.vlines[line_i][line_j] = self.PLAYER_COLORS[self.currentPlayer - 1]

        square_completed = self.updateSquares((line_i, line_j), line_type)
        self.updateNumstring()

        chain_length = self.numstring.count(3)

        # Undo the move
        if line_type == 'h':
            self.hlines[line_i][line_j] = None
        elif line_type == 'v':
            self.vlines[line_i][line_j] = None

        return square_completed, chain_length

    def isGameOver(self):
        for i in range(self.gridSize):
            for j in range(self.gridSize):
                if self.squares[i][j] == 0:
                    return False
        return True

    def checkSquareCompletionH(self, i, j):
        squareCompleted = False
        if (
                i > 0
                and self.vlines[i - 1][j] is not None
                and self.vlines[i - 1][j + 1] is not None
                and self.hlines[i - 1][j] is not None
        ):
            self.squares[i - 1][j] = self.currentPlayer
            squareCompleted = True
        if (
                i < self.gridSize
                and self.vlines[i][j] is not None
                and self.vlines[i][j + 1] is not None
                and self.hlines[i + 1][j] is not None
        ):
            self.squares[i][j] = self.currentPlayer
            squareCompleted = True
        return squareCompleted

    def checkSquareCompletionV(self, i, j):
        squareCompleted = False
        if (
                j > 0
                and self.hlines[i][j - 1] is not None
                and self.hlines[i + 1][j - 1] is not None
                and self.vlines[i][j - 1] is not None
        ):
            self.squares[i][j - 1] = self.currentPlayer
            squareCompleted = True
        if (
                j < self.gridSize
                and self.hlines[i][j] is not None
                and self.hlines[i + 1][j] is not None
                and self.vlines[i][j + 1] is not None
        ):
            self.squares[i][j] = self.currentPlayer
            squareCompleted = True
        return squareCompleted

    def updateSquares(self, line, lineType):
        lineI, lineJ = line
        squareCompleted = False
        if lineType == "h":
            squareCompleted = self.checkSquareCompletionH(lineI, lineJ)
        elif lineType == "v":
            squareCompleted = self.checkSquareCompletionV(lineI, lineJ)
        return squareCompleted

    def getAvailableLines(self):
        availableLines = []
        for i in range(self.gridSize + 1):
            for j in range(self.gridSize):
                if not self.hlines[i][j]:
                    availableLines.append(("h", i, j))
        for i in range(self.gridSize):
            for j in range(self.gridSize + 1):
                if not self.vlines[i][j]:
                    availableLines.append(("v", i, j))
        return availableLines

    def updateNumstring(self):
        for i in range(self.gridSize):
            for j in range(self.gridSize):
                top = int(self.hlines[i][j] is not None)
                bottom = int(self.hlines[i + 1][j] is not None)
                left = int(self.vlines[i][j] is not None)
                right = int(self.vlines[i][j + 1] is not None)
                self.numstring[i * self.gridSize + j] = top + bottom + left + right

    def generateOptimalMove(self):
        self.updateNumstring()
        available_lines = self.getAvailableLines()
        optimal_moves = []
        safe_moves = []
        risky_moves = []
        single_box_moves = []
        chain_moves = []

        for move in available_lines:
            line_type, line_i, line_j = move
            square_completed, chain_length = self.evaluateMove(line_type, line_i, line_j)

            if square_completed:
                optimal_moves.append(move)
            elif 3 in self.numstring:
                risky_moves.append(move)
                if chain_length == 1:
                    single_box_moves.append(move)
                elif chain_length > 2:
                    chain_moves.append(move)
            else:
                safe_moves.append(move)

            # Undo the move
            if line_type == 'h':
                self.hlines[line_i, line_j] = None
            elif line_type == 'v':
                self.vlines[line_i, line_j] = None

        # If there are moves that complete a square, return them
        if optimal_moves:
            print("optimal was used for this move.")
            return optimal_moves

        # If there are safe moves, return them
        if safe_moves:
            print("safe move was used for this move.")
            return safe_moves

        # If there are chain moves, return them
        if chain_moves:
            print("chain move was used for this move.")
            return chain_moves

        # If there are single box moves, return them
        if single_box_moves:
            print("singlebox was used for this move.")
            return single_box_moves

        # If there are risky moves, return them
        if risky_moves:
            print("Minimax was used for this move.")
            return risky_moves

        # If no moves found, use minimax
        return self.generate_optimal_move_minimax()

    def getComputerMove(self):
        availableLines = self.getAvailableLines()
        optimalMoves = self.generateOptimalMove()

        if optimalMoves:
            print("choosing optimal move")
            chosenMove = random.choice(optimalMoves)
        else:
            print("choosing available line")
            chosenMove = random.choice(availableLines)

        return chosenMove


app = Flask(__name__)
CORS(app)


@app.route('/get-computer-move', methods=['POST'])
def data():
    received_data = request.json
    hlines = received_data.get('hlines')
    vlines = received_data.get('vlines')
    gridSize = received_data.get('gridSize')

    if hlines is None or vlines is None or gridSize is None:
        return jsonify({'error': 'Missing data parameters'}), 400

    game = Game(np.array(hlines), np.array(vlines), gridSize)
    print(game.hlines)
    print(game.vlines)

    computer_move = game.getComputerMove()

    response = {
        'computer_move': computer_move
    }

    return jsonify(response)


if __name__ == '__main__':
    app.run(host='127.0.0.1', debug=True)