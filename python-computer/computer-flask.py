import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

import numpy as np
import random
import random


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

    def generate_optimal_move_minimax(self, depth=3):
        alpha = float('-inf')
        beta = float('inf')

        best_score = float('-inf')
        best_move = None

        for move in self.getAvailableLines():
            self.play_move(move)
            score = self.minimax(depth - 1, alpha, beta, False)
            self.undo_move(move)

            if score > best_score:
                best_score = score
                best_move = move

            alpha = max(alpha, score)

        return best_move

    def minimax(self, depth, alpha, beta, maximizing_player):
        if depth == 0 or self.isGameOver():
            return self.evaluate_position()

        if maximizing_player:
            max_eval = float('-inf')
            for move in self.getAvailableLines():
                self.play_move(move)
                eval = self.minimax(depth - 1, alpha, beta, False)
                self.undo_move(move)
                max_eval = max(max_eval, eval)
                alpha = max(alpha, eval)
                if beta <= alpha:
                    break
            return max_eval
        else:
            min_eval = float('inf')
            for move in self.getAvailableLines():
                self.play_move(move)
                eval = self.minimax(depth - 1, alpha, beta, True)
                self.undo_move(move)
                min_eval = min(min_eval, eval)
                beta = min(beta, eval)
                if beta <= alpha:
                    break
            return min_eval

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

    def evaluateMove(self, line_type, line_i, line_j):
        if line_type == 'h':
            self.hlines[line_i][line_j] = self.PLAYER_COLORS[self.currentPlayer - 1]
        elif line_type == 'v':
            self.vlines[line_i][line_j] = self.PLAYER_COLORS[self.currentPlayer - 1]

        # Calculate chain length
        chain_length = 0
        square_completed = self.updateSquares((line_i, line_j), line_type)
        while square_completed:
            chain_length += 1
            self.updateNumstring()
            square_completed = self.updateSquares((line_i, line_j), line_type)

        # Undo the move
        if line_type == 'h':
            self.hlines[line_i][line_j] = None
        elif line_type == 'v':
            self.vlines[line_i][line_j] = None
        self.numstring = [0] * (self.gridSize ** 2)
        self.updateNumstring()

        return square_completed, chain_length

    def generateOptimalMove(self):
        self.updateNumstring()
        available_lines = self.getAvailableLines()
        optimal_moves = []
        safe_moves = []
        risky_moves = []
        chain_moves = []

        # Separate chain_moves into two categories: long_chains and short_chains
        long_chains = []
        short_chains = []

        for move in available_lines:
            line_type, line_i, line_j = move
            square_completed, chain_length = self.evaluateMove(line_type, line_i, line_j)

            if square_completed:
                optimal_moves.append(move)
            elif 3 in self.numstring:
                risky_moves.append(move)
                if chain_length == 1:
                    short_chains.append(move)
                elif chain_length >= 3:
                    long_chains.append(move)
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

        # If there are long chain moves (3 or more), play them using minimax
        if long_chains:
            print("Minimax with Alpha-Beta pruning was used for this move.")
            best_move = self.generate_optimal_move_minimax()
            return [best_move]

        # If there are safe moves, return them
        if safe_moves:
            print("safe move was used for this move.")
            return safe_moves

        # If there are short chain moves, return them
        if short_chains:
            print("short chain move was used for this move.")
            return short_chains

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