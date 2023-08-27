import random

class Computer:
    def __init__(self):
        pass

    def get_computer_turn(self, game):
        available_lines = game.get_available_lines()
        optimal_moves = self.generate_optimal_move(game)

        if optimal_moves:
            chosen_move = random.choice(optimal_moves)
        else:
            chosen_move = random.choice(available_lines)

        return chosen_move

    def find_move_to_grab_chain(self, game, chain):
        for i, j in chain:
            if i > 0 and game.hlines[i - 1, j] is None and game.numstring[(i - 1) * game.grid_size + j] == 3:
                return 'h', i - 1, j
            if i < game.grid_size - 1 and game.hlines[i + 1, j] is None and game.numstring[(i + 1) * game.grid_size + j] == 3:
                return 'h', i + 1, j
            if j > 0 and game.vlines[i, j - 1] is None and game.numstring[i * game.grid_size + (j - 1)] == 3:
                return 'v', i, j - 1
            if j < game.grid_size - 1 and game.vlines[i, j + 1] is None and game.numstring[i * game.grid_size + (j + 1)] == 3:
                return 'v', i, j + 1
        return None

    def find_move_to_give_chain(self, game, chain):
        i, j = chain[0]
        if game.hlines[i, j] is None and game.numstring[i * game.grid_size + j] == 2:
            return 'h', i, j
        if i < game.grid_size and game.hlines[i + 1, j] is None and game.numstring[(i + 1) * game.grid_size + j] == 2:
            return 'h', i + 1, j
        if game.vlines[i, j] is None and game.numstring[i * game.grid_size + j] == 2:
            return 'v', i, j
        if j < game.grid_size and game.vlines[i, j + 1] is None and game.numstring[i * game.grid_size + (j + 1)] == 2:
            return 'v', i, j + 1
        return None

    def identify_chains(self, game):
        chains = []
        visited = set()
        for i in range(game.grid_size):
            for j in range(game.grid_size):
                if game.numstring[i * game.grid_size + j] >= 2 and (i, j) not in visited:
                    chain = []
                    found_chain = self.find_chain(game, i, j, chain, visited)
                    if found_chain:
                        chains.append(chain)

                        for x, y in chain:
                            if x + 1 < game.grid_size and game.numstring[(x + 1) * game.grid_size + y] >= 2 and \
                               game.hlines[x + 1, y] is None:
                                special_chain = []
                                found_special_chain = self.find_chain(game, x + 1, y, special_chain, visited)
                                if found_special_chain:
                                    chains.append(special_chain)

                            if y + 1 < game.grid_size and game.numstring[x * game.grid_size + (y + 1)] >= 2 and \
                               game.vlines[x, y + 1] is None:
                                special_chain = []
                                found_special_chain = self.find_chain(game, x, y + 1, special_chain, visited)
                                if found_special_chain:
                                    chains.append(special_chain)

        return sorted(chains, key=len)

    def find_chain(self, game, i, j, chain, visited):
        if 0 <= i < game.grid_size and 0 <= j < game.grid_size and (i, j) not in visited and game.numstring[i * game.grid_size + j] >= 2:
            chain.append((i, j))
            visited.add((i, j))

            for x, y in [(i - 1, j), (i + 1, j), (i, j - 1), (i, j + 1)]:
                if game.is_connected(i, j, x, y):
                    self.find_chain(game, x, y, chain, visited)

        return len(chain) > 1

    def generate_optimal_move(self, game):
        game.update_numstring()
        available_lines = game.get_available_lines()
        chains = self.identify_chains(game)

        # Rest of the code remains the same...
