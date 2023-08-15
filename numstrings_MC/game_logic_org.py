import pygame
import numpy as np
import math
import time
import random

GRID_SIZE = 5
LINE_THICKNESS = 5
DOT_RADIUS = 7
SCREEN_SIZE = 640  # 600 for the game grid + 40 for padding
SCORE_AREA_HEIGHT = 200
WINDOW_SIZE = (SCREEN_SIZE, SCREEN_SIZE + SCORE_AREA_HEIGHT)

WHITE = (255, 255, 255)
RED = (255, 0, 0)
BLUE = (0, 0, 255)
BLACK = (0, 0, 0)
LIGHT_GRAY = (200, 200, 200)

PLAYER_COLORS = [RED, BLUE]

class Game:
    def __init__(self, human_turn=True):
        self.current_player = 1
        self.hlines = np.full((GRID_SIZE + 1, GRID_SIZE), None)
        self.vlines = np.full((GRID_SIZE, GRID_SIZE + 1), None)
        self.squares = np.zeros((GRID_SIZE, GRID_SIZE), dtype=int)
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

        for i in range(GRID_SIZE + 1):
            for j in range(GRID_SIZE):
                mid_h = (j * self.box_size + self.box_size // 2, i * self.box_size)
                distance_h = math.hypot(mid_h[0] - x, mid_h[1] - y)
                if j < GRID_SIZE and not self.hlines[i, j] and distance_h < min_distance:
                    min_distance = distance_h
                    min_line = (i, j)
                    min_type = 'h'

            for j in range(GRID_SIZE + 1):
                mid_v = (j * self.box_size, i * self.box_size + self.box_size // 2)
                distance_v = math.hypot(mid_v[0] - x, mid_v[1] - y)
                if i < GRID_SIZE and not self.vlines[i, j] and distance_v < min_distance:
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

        if i < GRID_SIZE and self.vlines[i, j] is not None and self.vlines[i, j + 1] is not None and self.hlines[
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

        if j < GRID_SIZE and self.hlines[i, j] is not None and self.hlines[i + 1, j] is not None and self.vlines[
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
        for i in range(GRID_SIZE):
            for j in range(GRID_SIZE):
                if self.squares[i, j] != 0:
                    pygame.draw.rect(screen, PLAYER_COLORS[self.squares[i, j] - 1],
                                     (20 + j * self.box_size + LINE_THICKNESS // 2 + box_inner_margin,
                                      20 + i * self.box_size + LINE_THICKNESS // 2 + box_inner_margin,
                                      self.box_size - LINE_THICKNESS - 2 * box_inner_margin,
                                      self.box_size - LINE_THICKNESS - 2 * box_inner_margin))

    def draw_lines(self, screen):
        self.fill_boxes(screen)
        for i in range(GRID_SIZE + 1):
            for j in range(GRID_SIZE):
                color = self.hlines[i, j] if self.hlines[i, j] else LIGHT_GRAY
                pygame.draw.line(screen, color, (20 + j * self.box_size, 20 + i * self.box_size),
                                 (20 + (j + 1) * self.box_size, 20 + i * self.box_size),
                                 LINE_THICKNESS)

        for i in range(GRID_SIZE + 1):
            for j in range(GRID_SIZE + 1):
                if i < GRID_SIZE:
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
        for i in range(GRID_SIZE + 1):
            for j in range(GRID_SIZE):
                if not self.hlines[i, j]:
                    available_lines.append(('h', i, j))
        for i in range(GRID_SIZE):
            for j in range(GRID_SIZE + 1):
                if not self.vlines[i, j]:
                    available_lines.append(('v', i, j))
        return available_lines

    def is_connected(self, i1, j1, i2, j2):
        if not (0 <= i1 < GRID_SIZE and 0 <= i2 < GRID_SIZE and 0 <= j1 < GRID_SIZE and 0 <= j2 < GRID_SIZE):
            return False

        # Check if the squares are directly adjacent
        is_adjacent = (i1 == i2 and abs(j1 - j2) == 1) or (j1 == j2 and abs(i1 - i2) == 1)

        if not is_adjacent:
            return False

        # Check horizontal connection
        if i1 == i2:
            return self.vlines[i1, max(j1, j2)] is None

        # Check vertical connection
        if j1 == j2:
            return self.hlines[max(i1, i2), j1] is None

        return False

    def find_chain(self, i, j, chain, visited):
        if 0 <= i < GRID_SIZE and 0 <= j < GRID_SIZE and (i, j) not in visited and self.numstring[
            i * GRID_SIZE + j] == 2:
            chain.append((i, j))
            visited.add((i, j))

            # Check neighbors (up, down, left, right)
            for x, y in [(i - 1, j), (i + 1, j), (i, j - 1), (i, j + 1)]:
                if self.is_connected(i, j, x, y):  # Check connection between squares
                    self.find_chain(x, y, chain, visited)

        return len(chain) > 1  # Return True if a chain (more than one square) is found

    def identify_chains(self):
        chains = []
        visited = set()  # To keep track of visited squares
        for i in range(GRID_SIZE):
            for j in range(GRID_SIZE):
                if self.numstring[i * GRID_SIZE + j] == 2 and (i, j) not in visited:
                    chain = []
                    found_chain = self.find_chain(i, j, chain, visited)
                    if found_chain:
                        chains.append(chain)
        return chains

    def update_numstring(self):
        for i in range(GRID_SIZE):
            for j in range(GRID_SIZE):
                top = int(self.hlines[i, j] is not None)
                bottom = int(self.hlines[i + 1, j] is not None)
                left = int(self.vlines[i, j] is not None)
                right = int(self.vlines[i, j + 1] is not None)
                self.numstring[i * GRID_SIZE + j] = top + bottom + left + right

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

    def find_move_to_grab_chain(self, chain):
        for i, j in chain:
            if i > 0 and self.hlines[i - 1, j] is None and self.numstring[(i - 1) * GRID_SIZE + j] == 3:
                return 'h', i - 1, j
            if i < GRID_SIZE - 1 and self.hlines[i + 1, j] is None and self.numstring[(i + 1) * GRID_SIZE + j] == 3:
                return 'h', i + 1, j
            if j > 0 and self.vlines[i, j - 1] is None and self.numstring[i * GRID_SIZE + (j - 1)] == 3:
                return 'v', i, j - 1
            if j < GRID_SIZE - 1 and self.vlines[i, j + 1] is None and self.numstring[i * GRID_SIZE + (j + 1)] == 3:
                return 'v', i, j + 1
        return None

    def find_move_to_give_chain(self, chain):
        # Find the end squares of the chain
        end_squares = [square for square in chain if sum(
            self.is_connected(square[0], square[1], *neighbor) for neighbor in chain if neighbor != square) == 1]

        # Look for a move that affects one of the end squares without creating a new chain
        for i, j in end_squares:
            # Check the horizontal lines
            if self.hlines[i, j] is None and self.numstring[i * GRID_SIZE + j] == 2:
                return 'h', i, j
            if i < GRID_SIZE and self.hlines[i + 1, j] is None and self.numstring[(i + 1) * GRID_SIZE + j] == 2:
                return 'h', i + 1, j

            # Check the vertical lines
            if self.vlines[i, j] is None and self.numstring[i * GRID_SIZE + j] == 2:
                return 'v', i, j
            if j < GRID_SIZE and self.vlines[i, j + 1] is None and self.numstring[i * GRID_SIZE + (j + 1)] == 2:
                return 'v', i, j + 1

        return None

    # Modified generate_optimal_move method
    def generate_optimal_move(self):
        self.update_numstring()  # Update the numstring before deciding on a move
        available_lines = self.get_available_lines()

        # Identify chains
        chains = self.identify_chains()
        print("Identified chains with lengths:", [len(chain) for chain in chains])

        # Try to grab the longest chain
        best_grab_move = None
        best_grab_length = float('-inf')
        for chain in chains:
            third_side_found = self.find_chain(*chain[0], [], set())
            if third_side_found and len(chain) > best_grab_length:
                best_grab_length = len(chain)
                best_grab_move = self.find_move_to_grab_chain(chain)

        if best_grab_move:
            print("Making a move to grab the longest chain.")
            return [best_grab_move]

        # Try to give the shortest chain that is "safe" (i.e., doesn't have a third side filled)
        best_give_move = None
        best_give_length = float('inf')
        for chain in chains:
            third_side_found = self.find_chain(*chain[0], [], set())
            if not third_side_found:
                chain_length = len(chain)
                if chain_length < best_give_length:
                    best_give_length = chain_length
                    best_give_move = self.find_move_to_give_chain(chain)

        if best_give_move:
            print(f"Making a move to give the shortest safe chain of length {best_give_length}.")
            return [best_give_move]

        optimal_moves = []
        risky_moves = []
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
            elif 3 in self.numstring:
                risky_moves.append(move)

            # Undo the move
            if line_type == 'h':
                self.hlines[line_i, line_j] = None
            elif line_type == 'v':
                self.vlines[line_i, line_j] = None

        # If there are moves that complete a square, return them
        if optimal_moves:
            print("Computer made an optimal move to complete a square.")
            return optimal_moves

        # Otherwise, return only the moves that don't risk setting up the opponent
        safe_moves = [move for move in available_lines if move not in risky_moves]
        print("Computer made a safe move (not setting up the opponent).")
        return safe_moves


