from flask import Flask, request, jsonify
from flask_cors import CORS
import pygame
import numpy as np
import math
import time
import random

LINE_THICKNESS = 5
DOT_RADIUS = 7
SCREEN_SIZE = 640
SCORE_AREA_HEIGHT = 200
WINDOW_SIZE = (SCREEN_SIZE, SCREEN_SIZE + SCORE_AREA_HEIGHT)

WHITE = (255, 255, 255)
RED = (255, 0, 0)
BLUE = (0, 0, 255)
BLACK = (0, 0, 0)
LIGHT_GRAY = (200, 200, 200)

PLAYER_COLORS = [RED, BLUE]


class Game:
    def __init__(self, human_turn=True, GRID_SIZE=3):
        self.current_player = 1
        self.hlines = np.full((GRID_SIZE + 1, GRID_SIZE), None)
        self.vlines = np.full((GRID_SIZE, GRID_SIZE + 1), None)
        self.squares = np.zeros((GRID_SIZE, GRID_SIZE), dtype=int)
        self.GRID_SIZE = GRID_SIZE
        self.square_counter = 1
        self.game_over = False
        self.human_turn = human_turn  # Set this based on the passed parameter
        self.game_end_timer = None
        self.square_completed_last_turn = False
        self.box_size = (SCREEN_SIZE - 40) // GRID_SIZE
        self.numstring = [0] * (GRID_SIZE ** 2)  # numstring is now a list of integers

    def update_line(self, x, y):
        min_distance = float('inf')
        min_line = None
        min_type = None

        for i in range(self.GRID_SIZE + 1):
            for j in range(self.GRID_SIZE):
                mid_h = (j * self.box_size + self.box_size // 2, i * self.box_size)
                distance_h = math.hypot(mid_h[0] - x, mid_h[1] - y)
                if j < self.GRID_SIZE and not self.hlines[i, j] and distance_h < min_distance:
                    min_distance = distance_h
                    min_line = (i, j)
                    min_type = 'h'

            for j in range(self.GRID_SIZE + 1):
                mid_v = (j * self.box_size, i * self.box_size + self.box_size // 2)
                distance_v = math.hypot(mid_v[0] - x, mid_v[1] - y)
                if i < self.GRID_SIZE and not self.vlines[i, j] and distance_v < min_distance:
                    min_distance = distance_v
                    min_line = (i, j)
                    min_type = 'v'

        if min_line is not None:
            if min_type == 'h':
                self.hlines[min_line] = PLAYER_COLORS[self.current_player - 1]
                square_completed = self.update_squares(min_line, 'h')
            elif min_type == 'v':
                self.vlines[min_line] = PLAYER_COLORS[self.current_player - 1]
                square_completed = self.update_squares(min_line, 'v')

            if not square_completed and not self.square_completed_last_turn:
                self.current_player = 2 if self.current_player == 1 else 1
                self.human_turn = not self.human_turn

    def check_square_completion_h(self, i, j):
        """Check if squares have been completed when a horizontal line is filled."""
        square_completed = False
        if i > 0 and self.vlines[i - 1, j] is not None and self.vlines[i - 1, j + 1] is not None and self.hlines[
            i - 1, j] is not None:
            self.squares[i - 1, j] = self.current_player
            square_completed = True

        if i < self.GRID_SIZE and self.vlines[i, j] is not None and self.vlines[i, j + 1] is not None and self.hlines[
            i + 1, j] is not None:
            self.squares[i, j] = self.current_player
            square_completed = True

        return square_completed

    def check_square_completion_v(self, i, j):
        """Check if squares have been completed when a vertical line is filled."""
        square_completed = False
        if j > 0 and self.hlines[i, j - 1] is not None and self.hlines[i + 1, j - 1] is not None and self.vlines[
            i, j - 1] is not None:
            self.squares[i, j - 1] = self.current_player
            square_completed = True

        if j < self.GRID_SIZE and self.hlines[i, j] is not None and self.hlines[i + 1, j] is not None and self.vlines[
            i, j + 1] is not None:
            self.squares[i, j] = self.current_player
            square_completed = True

        return square_completed

    def update_squares(self, line, line_type):
        i, j = line
        square_completed = False
        if line_type == 'h':
            square_completed = self.check_square_completion_h(i, j)
        elif line_type == 'v':
            square_completed = self.check_square_completion_v(i, j)
        return square_completed

    def fill_boxes(self, screen):
        box_inner_margin = 10  # Adjust this to change the size of the border
        for i in range(self.GRID_SIZE):
            for j in range(self.GRID_SIZE):
                if self.squares[i, j] != 0:
                    pygame.draw.rect(screen, PLAYER_COLORS[self.squares[i, j] - 1],
                                     (20 + j * self.box_size + LINE_THICKNESS // 2 + box_inner_margin,
                                      20 + i * self.box_size + LINE_THICKNESS // 2 + box_inner_margin,
                                      self.box_size - LINE_THICKNESS - 2 * box_inner_margin,
                                      self.box_size - LINE_THICKNESS - 2 * box_inner_margin))

    def draw_lines(self, screen):
        self.fill_boxes(screen)
        for i in range(self.GRID_SIZE + 1):
            for j in range(self.GRID_SIZE):
                color = self.hlines[i, j] if self.hlines[i, j] else LIGHT_GRAY
                pygame.draw.line(screen, color, (20 + j * self.box_size, 20 + i * self.box_size),
                                 (20 + (j + 1) * self.box_size, 20 + i * self.box_size),
                                 LINE_THICKNESS)

        for i in range(self.GRID_SIZE + 1):
            for j in range(self.GRID_SIZE + 1):
                if i < self.GRID_SIZE:
                    color = self.vlines[i, j] if self.vlines[i, j] else LIGHT_GRAY
                    pygame.draw.line(screen, color, (20 + j * self.box_size, 20 + i * self.box_size),
                                     (20 + j * self.box_size, 20 + (i + 1) * self.box_size),
                                     LINE_THICKNESS)

                pygame.draw.circle(screen, BLACK, (20 + j * self.box_size, 20 + i * self.box_size), DOT_RADIUS)

    def display_scores(self, screen):
        player1_score = np.sum(self.squares == 1)
        player2_score = np.sum(self.squares == 2)

        font = pygame.font.Font(None, 50)
        score_surface = pygame.Surface((SCREEN_SIZE, SCORE_AREA_HEIGHT))
        score_surface.fill(WHITE)  # Fill the surface with solid white color

        text1 = font.render(f"Player 1: {player1_score}", True, BLACK)  # Set text color to BLACK
        text1_rect = text1.get_rect(center=(SCREEN_SIZE // 2, SCORE_AREA_HEIGHT // 3))
        score_surface.blit(text1, text1_rect)

        text2 = font.render(f"Player 2: {player2_score}", True, BLACK)  # Set text color to BLACK
        text2_rect = text2.get_rect(center=(SCREEN_SIZE // 2, 2 * SCORE_AREA_HEIGHT // 3))
        score_surface.blit(text2, text2_rect)

        screen.blit(score_surface, (0, SCREEN_SIZE))

    def get_available_lines(self):
        available_lines = []
        for i in range(self.GRID_SIZE + 1):
            for j in range(self.GRID_SIZE):
                if not self.hlines[i, j]:
                    available_lines.append(('h', i, j))
        for i in range(self.GRID_SIZE):
            for j in range(self.GRID_SIZE + 1):
                if not self.vlines[i, j]:
                    available_lines.append(('v', i, j))
        return available_lines

    def update_numstring(self):
        for i in range(self.GRID_SIZE):
            for j in range(self.GRID_SIZE):
                top = int(self.hlines[i, j] is not None)
                bottom = int(self.hlines[i + 1, j] is not None)
                left = int(self.vlines[i, j] is not None)
                right = int(self.vlines[i, j + 1] is not None)
                self.numstring[i * self.GRID_SIZE + j] = top + bottom + left + right

    def computer_turn(self):
        if self.game_over:  # Check if the game is already over
            return

        self.square_completed_last_turn = False  # Reset the variable at the start of the turn
        square_completed = True
        available_lines = self.get_available_lines()

        optimal_moves = self.generate_optimal_move()

        if optimal_moves:
            chosen_move = random.choice(optimal_moves)
            print("Numstring was used for this move.")
        else:
            chosen_move = random.choice(available_lines)
            print("Minimax was used for this move.")

        line_type, line_i, line_j = chosen_move

        if line_type == 'h':
            self.hlines[line_i, line_j] = PLAYER_COLORS[self.current_player - 1]
        elif line_type == 'v':
            self.vlines[line_i, line_j] = PLAYER_COLORS[self.current_player - 1]

        square_completed = self.update_squares((line_i, line_j), line_type)

        if not square_completed and not self.square_completed_last_turn:
            self.current_player = 2 if self.current_player == 1 else 1
            self.human_turn = True

    def make_move(self, move):
        line_type, line_i, line_j = move
        if line_type == 'h':
            self.hlines[line_i, line_j] = PLAYER_COLORS[self.current_player - 1]
        elif line_type == 'v':
            self.vlines[line_i, line_j] = PLAYER_COLORS[self.current_player - 1]
        square_completed = self.update_squares((line_i, line_j), line_type)
        if square_completed:
            self.square_completed_last_turn = True

    def minimax(self, game, depth, alpha, beta, maximizing_player):
        if depth == 0 or game.game_over:
            return self.evaluate(game)

        if maximizing_player:
            max_eval = float('-inf')
            for move in game.get_available_lines():
                new_game = deepcopy(game)
                new_game.make_move(move)
                eval = self.minimax(new_game, depth - 1, alpha, beta, False)
                max_eval = max(max_eval, eval)
                alpha = max(alpha, eval)
                if beta <= alpha:
                    break
            return max_eval
        else:
            min_eval = float('inf')
            for move in game.get_available_lines():
                new_game = deepcopy(game)
                new_game.make_move(move)
                eval = self.minimax(new_game, depth - 1, alpha, beta, True)
                min_eval = min(min_eval, eval)
                beta = min(beta, eval)
                if beta <= alpha:
                    break
            return min_eval

    def calculate_chains(self, game):
        chains = 0
        for i in range(game.GRID_SIZE):
            for j in range(game.GRID_SIZE):
                if game.squares[i][j] == 0:  # square is not yet filled
                    count = 0
                    if i < game.GRID_SIZE - 1 and game.squares[i + 1][j] == 0:
                        count += 1
                    if j < game.GRID_SIZE - 1 and game.squares[i][j + 1] == 0:
                        count += 1
                    if i > 0 and game.squares[i - 1][j] == 0:
                        count += 1
                    if j > 0 and game.squares[i][j - 1] == 0:
                        count += 1
                    chains += count ** 2 if count >= 2 else 0  # consider chain when there are two or more empty adjacent boxes
        return chains

    def evaluate(self, game):
        player1_score = np.sum(game.squares == 1)
        player2_score = np.sum(game.squares == 2)
        total_boxes = game.GRID_SIZE ** 2
        boxes_left = total_boxes - (player1_score + player2_score)
        boxes_diff = player1_score - player2_score

        chains = self.calculate_chains(game)

        evaluation = 3 * boxes_diff + 2 * boxes_left + 10 * chains  # add a weight to chains

        return evaluation

    def generate_optimal_move(self):
        self.update_numstring()  # Update the numstring before deciding on a move
        available_lines = self.get_available_lines()
        optimal_moves = []
        safe_moves = []
        risky_moves = []
        single_box_moves = []
        chain_moves = []

        for move in available_lines:
            line_type, line_i, line_j = move
            if line_type == 'h':
                self.hlines[line_i, line_j] = PLAYER_COLORS[self.current_player - 1]
            elif line_type == 'v':
                self.vlines[line_i, line_j] = PLAYER_COLORS[self.current_player - 1]

            square_completed = self.update_squares((line_i, line_j), line_type)
            self.update_numstring()

            if square_completed:
                optimal_moves.append(move)
            elif 3 in self.numstring:  # If this move would set up the opponent to complete a square
                risky_moves.append(move)
                if self.numstring.count(3) == 1:  # If this is the only box that would be completed
                    single_box_moves.append(move)
                elif self.numstring.count(3) > 2:  # If this is a chain of squares
                    chain_moves.append(move)
            else:  # This is a safe move, does not immediately lead to a square completion
                safe_moves.append(move)

            # Undo the move
            if line_type == 'h':
                self.hlines[line_i, line_j] = None
            elif line_type == 'v':
                self.vlines[line_i, line_j] = None

        # If there are moves that complete a square, return them
        if optimal_moves:
            print("Making an optimal move.")
            return optimal_moves

        # If there are safe moves, return them
        if safe_moves:
            print("Making a safe move.")
            return safe_moves
        # If there are chain moves, return them
        if chain_moves:
            print("Making a chain move.")
            return chain_moves

        # If there are single box moves, return them
        if single_box_moves:
            print("Making a single box move.")
            return single_box_moves

        # If there are risky moves, return them
        if risky_moves:
            print("Making a risky move.")
            print("Minimax was used for this move.")
            return risky_moves

        # If no moves found, use minimax
        return self.generate_optimal_move_minimax()

    def generate_optimal_move_minimax(self):
        best_score = float('-inf')
        best_moves = []

        for move in self.get_available_lines():
            line_type, line_i, line_j = move
            new_game = deepcopy(self)
            new_game.make_move(move)
            score = self.minimax(new_game, 3, float('-inf'), float('inf'), False)

            if score > best_score:
                best_score = score
                best_moves = [move]
            elif score == best_score:
                best_moves.append(move)

        if best_moves:
            return best_moves
        else:
            return self.get_available_lines()



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

    game = Game()
    game.hlines = np.array(hlines)
    game.vlines = np.array(vlines)
    game.GRID_SIZE = gridSize;

    computer_move = game.get_computer_move()

    response = {
        'computer_move': computer_move
    }

    return jsonify(response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)