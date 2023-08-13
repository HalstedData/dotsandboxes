import numpy as np

PLAYER1 = 1
PLAYER2 = -1

class DotsAndBoxes:
    def __init__(self, size):
        self.size = size
        self.hlines = np.full((self.size + 1, self.size), False)
        self.vlines = np.full((self.size, self.size + 1), False)
        self.boxes = np.zeros((self.size, self.size), dtype=int)
        self.turn = PLAYER1
        self.scores = {PLAYER1: 0, PLAYER2: 0}
        self.moves_sequence = []
        self.last_move = None  # This will store the last move made.


    def duplicate(self):
        dup = DotsAndBoxes(self.size)
        dup.hlines = np.copy(self.hlines)
        dup.vlines = np.copy(self.vlines)
        dup.boxes = np.copy(self.boxes)
        dup.turn = self.turn
        dup.scores = self.scores.copy()
        dup.moves_sequence = self.moves_sequence.copy()
        return dup

    def game_over(self):
        return np.all(self.hlines) and np.all(self.vlines) and np.all(self.boxes != 0)

    def evaluate(self, player):
        return self.scores[player] - self.scores[-player]

    def store_move(self, x, y, is_horizontal):
        self.moves_sequence.append((x, y, is_horizontal, self.turn))

    def draw_line(self, x, y, is_horizontal, store_move=True):
        boxes_made = 0
        if is_horizontal:
            self.hlines[y, x] = True
        else:
            self.vlines[y, x] = True

        if store_move:
            self.store_move(x, y, is_horizontal)

        for dy in range(2):
            for dx in range(2):
                if (
                        y - dy >= 0
                        and x - dx >= 0
                        and y + 1 - dy <= self.size
                        and x + 1 - dx <= self.size
                ):
                    if (
                            self.hlines[y - dy, x - dx]
                            and self.hlines[y - dy + 1, x - dx]
                            and self.vlines[y - dy, x - dx]
                            and self.vlines[y - dy, x - dx + 1]
                    ):
                        if self.boxes[y - dy, x - dx] == 0:
                            self.boxes[y - dy, x - dx] = self.turn
                            boxes_made += 1

        if boxes_made > 0:
            self.scores[self.turn] += boxes_made
        else:
            self.turn *= -1

        if store_move:
            self.last_move = (x, y, is_horizontal)

        return boxes_made

    def get_next_states(self):
        if self.game_over():
            return []
        next_states = []
        moves = self.get_next_moves()
        for move in moves:
            dup = self.duplicate()
            boxes_made = dup.draw_line(*move)
            dup.store_move(*move)
            if boxes_made > 0:
                dup.turn = self.turn
            else:
                dup.turn *= -1
            next_states.append(dup)
        return next_states

    def get_next_moves(self):
        h_moves = [
            (x, y, True)
            for y in range(self.size + 1)
            for x in range(self.size)
            if not self.hlines[y, x]
        ]
        v_moves = [
            (x, y, False)
            for y in range(self.size)
            for x in range(self.size + 1)
            if not self.vlines[y, x]
        ]
        return h_moves + v_moves

    def check_completed_square(self, move):
        if move is None:
            return False

        x, y, is_horizontal = move
        square_completed = False

        if is_horizontal:
            if y > 0 and self.hlines[x, y - 1] and self.hlines[x, y] and self.vlines[x, y] and self.vlines[x + 1, y]:
                square_completed = True
            if y < self.size and self.hlines[x, y] and self.hlines[x, y + 1] and self.vlines[x, y] and self.vlines[
                x + 1, y]:
                square_completed = True
        else:
            if x > 0 and self.vlines[x - 1, y] and self.vlines[x, y] and self.hlines[x, y] and self.hlines[x, y + 1]:
                square_completed = True
            if x < self.size and self.vlines[x, y] and self.vlines[x + 1, y] and self.hlines[x, y] and self.hlines[
                x, y + 1]:
                square_completed = True

        return square_completed

    def get_reward(self):
        return self.scores[1] - self.scores[-1]