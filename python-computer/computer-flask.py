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
    def __init__(self):
        self.current_player = 1
        self.gridsize = 3;
        self.hlines = np.full((self.gridsize + 1, self.gridsize), None)
        self.vlines = np.full((self.gridsize, self.gridsize + 1), None)
        self.squares = np.zeros((self.gridsize, self.gridsize), dtype=int)
        self.square_counter = 1
        self.game_over = False
        self.human_turn = True
        self.game_end_timer = None
        self.square_completed_last_turn = False

    def update_line(self, x, y):
        min_distance = float('inf')
        min_line = None
        min_type = None

        for i in range(self.gridsize + 1):
            for j in range(self.gridsize):
                mid_h = (j * self.box_size + self.box_size // 2, i * self.box_size)
                distance_h = math.hypot(mid_h[0] - x, mid_h[1] - y)
                if j < self.gridsize and not self.hlines[i, j] and distance_h < min_distance:
                    min_distance = distance_h
                    min_line = (i, j)
                    min_type = 'h'

            for j in range(self.gridsize + 1):
                mid_v = (j * self.box_size, i * self.box_size + self.box_size // 2)
                distance_v = math.hypot(mid_v[0] - x, mid_v[1] - y)
                if i < self.gridsize and not self.vlines[i, j] and distance_v < min_distance:
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
        if i > 0 and self.vlines[i - 1, j] is not None and self.vlines[i - 1, j + 1] is not None and self.hlines[i - 1, j] is not None:
            self.squares[i - 1, j] = self.current_player
            square_completed = True

        if i < self.gridsize and self.vlines[i, j] is not None and self.vlines[i, j + 1] is not None and self.hlines[i + 1, j] is not None:
            self.squares[i, j] = self.current_player
            square_completed = True

        return square_completed

    def check_square_completion_v(self, i, j):
        """Check if squares have been completed when a vertical line is filled."""
        square_completed = False
        if j > 0 and self.hlines[i, j - 1] is not None and self.hlines[i + 1, j - 1] is not None and self.vlines[i, j - 1] is not None:
            self.squares[i, j - 1] = self.current_player
            square_completed = True

        if j < self.gridsize and self.hlines[i, j] is not None and self.hlines[i + 1, j] is not None and self.vlines[i, j + 1] is not None:
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
        for i in range(self.gridsize):
            for j in range(self.gridsize):
                if self.squares[i, j] != 0:
                    pygame.draw.rect(screen, PLAYER_COLORS[self.squares[i, j] - 1],
                                     (20 + j * self.box_size + LINE_THICKNESS // 2 + box_inner_margin,
                                      20 + i * self.box_size + LINE_THICKNESS // 2 + box_inner_margin,
                                      self.box_size - LINE_THICKNESS - 2 * box_inner_margin,
                                      self.box_size - LINE_THICKNESS - 2 * box_inner_margin))

    def draw_lines(self, screen):
        self.fill_boxes(screen)
        for i in range(self.gridsize + 1):
            for j in range(self.gridsize):
                color = self.hlines[i, j] if self.hlines[i, j] else LIGHT_GRAY
                pygame.draw.line(screen, color, (20 + j * self.box_size, 20 + i * self.box_size),
                                 (20 + (j + 1) * self.box_size, 20 + i * self.box_size),
                                 LINE_THICKNESS)

        for i in range(self.gridsize + 1):
            for j in range(self.gridsize + 1):
                if i < self.gridsize:
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
        score_surface.set_alpha(128)
        score_surface.fill(WHITE)

        text1 = font.render(f"Player 1: {player1_score}", True, BLACK)
        text1_rect = text1.get_rect(center=(SCREEN_SIZE // 2, SCORE_AREA_HEIGHT // 3))
        score_surface.blit(text1, text1_rect)

        text2 = font.render(f"Player 2: {player2_score}", True, BLACK)
        text2_rect = text2.get_rect(center=(SCREEN_SIZE // 2, 2 * SCORE_AREA_HEIGHT // 3))
        score_surface.blit(text2, text2_rect)

        screen.blit(score_surface, (0, SCREEN_SIZE))

    def get_available_lines(self):
        available_lines = []
        for i in range(self.gridsize + 1):
            for j in range(self.gridsize):
                if not self.hlines[i, j]:
                    available_lines.append(('h', i, j))
        for i in range(self.gridsize):
            for j in range(self.gridsize + 1):
                if not self.vlines[i, j]:
                    available_lines.append(('v', i, j))
        return available_lines

    def generate_optimal_move(self):
        available_lines = self.get_available_lines()
        optimal_moves = []

        for move in available_lines:
            line_type, line_i, line_j = move
            if line_type == 'h':
                self.hlines[line_i, line_j] = PLAYER_COLORS[self.current_player - 1]
            elif line_type == 'v':
                self.vlines[line_i, line_j] = PLAYER_COLORS[self.current_player - 1]

            square_completed = self.update_squares((line_i, line_j), line_type)
            if square_completed:
                optimal_moves.append(move)

            if line_type == 'h':
                self.hlines[line_i, line_j] = None
            elif line_type == 'v':
                self.vlines[line_i, line_j] = None

        return optimal_moves

    def get_computer_move(self):
        available_lines = self.get_available_lines()
        optimal_moves = self.generate_optimal_move()

        if optimal_moves:
            chosen_move = random.choice(optimal_moves)
        else:
            chosen_move = random.choice(available_lines)
        return chosen_move

    def computer_turn(self):
        self.square_completed_last_turn = False  # Reset the variable at the start of the turn
        square_completed = True
        while square_completed and len(self.get_available_lines()) > 0:
            square_completed = False
            available_lines = self.get_available_lines()
            optimal_moves = self.generate_optimal_move()

            if optimal_moves:
                chosen_move = random.choice(optimal_moves)
            else:
                chosen_move = random.choice(available_lines)

            line_type, line_i, line_j = chosen_move

            if line_type == 'h':
                self.hlines[line_i, line_j] = PLAYER_COLORS[self.current_player - 1]
            elif line_type == 'v':
                self.vlines[line_i, line_j] = PLAYER_COLORS[self.current_player - 1]

            square_completed = self.update_squares((line_i, line_j), line_type)

        if not square_completed and not self.square_completed_last_turn:
            self.current_player = 2 if self.current_player == 1 else 1
            self.human_turn = True

    def play_game(self):
        pygame.init()
        screen = pygame.display.set_mode(WINDOW_SIZE)
        pygame.display.set_caption("Dots and Boxes")
        clock = pygame.time.Clock()

        self.box_size = (SCREEN_SIZE - 40) // self.gridsize

        running = True
        while running:
            self.square_completed_last_turn = False

            screen.fill(WHITE)

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.MOUSEBUTTONDOWN and self.human_turn:
                    x, y = event.pos
                    self.update_line(x, y - 20)

            if not self.human_turn:
                self.computer_turn()

            self.draw_lines(screen)
            self.display_scores(screen)

            if np.all(self.hlines) and np.all(self.vlines):
                if not self.game_over:
                    self.game_over = True
                    self.game_end_timer = time.time()

            pygame.display.flip()






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
    game.gridsize = gridSize;

    computer_move = game.get_computer_move()

    response = {
        'computer_move': computer_move
    }

    return jsonify(response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)