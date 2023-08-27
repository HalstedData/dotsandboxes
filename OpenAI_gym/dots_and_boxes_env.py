import gym
from gym import spaces
import numpy as np
import matplotlib.pyplot as plt
from collections import Counter

class DotsAndBoxesEnv(gym.Env):
    PLAYER1 = 1
    PLAYER2 = -1

    def __init__(self, size=3):
        self.size = size
        self.hlines = np.full((self.size + 1, self.size), False)
        self.vlines = np.full((self.size, self.size + 1), False)
        self.boxes = np.zeros((self.size, self.size), dtype=int)
        self.turn = self.PLAYER1
        self.scores = {self.PLAYER1: 0, self.PLAYER2: 0}
        self.action_space = spaces.Discrete(2 * self.size * (self.size + 1))
        self.observation_space = spaces.Box(
            low=0, high=1,
            shape=(2 * (self.size + 1) * self.size + self.size * self.size,),
            dtype=np.int32
        )

    def check_square_completion_h(self, i, j):
        """Check if squares have been completed when a horizontal line is filled."""
        square_completed = False
        if i > 0 and self.vlines[i - 1, j] and self.vlines[i - 1, j + 1] and self.hlines[
            i - 1, j]:
            self.boxes[i - 1, j] = self.turn
            square_completed = True

        if i < self.size and self.vlines[i, j] and self.vlines[i, j + 1] and self.hlines[
            i + 1, j]:
            self.boxes[i, j] = self.turn
            square_completed = True

        return square_completed

    def check_square_completion_v(self, i, j):
        """Check if squares have been completed when a vertical line is filled."""
        square_completed = False
        if j > 0 and self.hlines[i, j - 1] and self.hlines[i + 1, j - 1] and self.vlines[
            i, j - 1]:
            self.boxes[i, j - 1] = self.turn
            square_completed = True

        if j < self.size and self.hlines[i, j] and self.hlines[i + 1, j] and self.vlines[
            i, j + 1]:
            self.boxes[i, j] = self.turn
            square_completed = True

        return square_completed

    def update_squares(self, line, line_type):
        i, j = line
        square_completed = 0
        if line_type == 'h':
            square_completed_h1 = self.check_square_completion_h(i, j)
            square_completed_h2 = self.check_square_completion_h(i - 1, j)
            square_completed = square_completed_h1 + square_completed_h2
        elif line_type == 'v':
            square_completed_v1 = self.check_square_completion_v(i, j)
            square_completed_v2 = self.check_square_completion_v(i, j - 1)
            square_completed = square_completed_v1 + square_completed_v2
        return square_completed

    def reset(self):
        self.hlines.fill(False)
        self.vlines.fill(False)
        self.boxes.fill(0)
        self.turn = self.PLAYER1
        self.scores = {self.PLAYER1: 0, self.PLAYER2: 0}
        return self._get_observation()

    def step(self, action):
        total_lines = 2 * self.size * (self.size + 1)
        if action < 0 or action >= total_lines:
            return self._get_observation(), -1, False, {}  # Invalid action

        line_type = 'h' if action < self.size * (self.size + 1) else 'v'
        action_mod = action % (self.size * (self.size + 1))

        if line_type == 'h':
            i, j = divmod(action_mod, self.size)
            if i >= self.size + 1 or j >= self.size:  # Corrected condition
                return self._get_observation(), -1, False, {}  # Invalid move


        else:  # line_type == 'v'
            i, j = divmod(action_mod, self.size + 1)
            if i >= self.size or j >= self.size + 1:
                return self._get_observation(), -1, False, {}  # Invalid move

        if (line_type == 'h' and self.hlines[i, j]) or (line_type == 'v' and self.vlines[i, j]):
            return self._get_observation(), -1, False, {}

        if line_type == 'h':
            self.hlines[i, j] = True
        else:
            self.vlines[i, j] = True

        print("Boxes state:", self.boxes)

        print(f"Action: {action}, Line Type: {line_type}, Indices: ({i}, {j})")  # Debugging line

        square_completed = self.update_squares((i, j), line_type)
        print(f"Square Completed: {square_completed}, Scores: {self.scores}")  # Debugging line

        if square_completed:
            self.scores[self.turn] += 1

        if not square_completed:
            self.turn = self.PLAYER2 if self.turn == self.PLAYER1 else self.PLAYER1

        done = self._game_over()

        print(f"Game Over: {done}")  # Debugging line

        return self._get_observation(), self.scores[self.turn], done, {}

    def _get_observation(self):
        return np.concatenate([
            self.hlines.astype(np.int32).flatten(),
            self.vlines.astype(np.int32).flatten(),
            self.boxes.flatten()
        ])

    def _game_over(self):
        completed_squares = np.count_nonzero(self.boxes)
        print(completed_squares)
        print(self.boxes)
        return completed_squares == self.size * self.size

    def render(self, mode='human'):
        plt.imshow(np.ones((self.size, self.size, 3)))

        for i in range(self.size + 1):
            for j in range(self.size):
                if self.hlines[i, j]:
                    plt.plot([j, j + 1], [i, i], 'k-', lw=2)

        for i in range(self.size):
            for j in range(self.size + 1):
                if self.vlines[i, j]:
                    plt.plot([j, j], [i, i + 1], 'k-', lw=2)

        for i in range(self.size):
            for j in range(self.size):
                if self.boxes[i, j] != 0:
                    plt.text(j + 0.5, i + 0.5, str(self.boxes[i, j]), ha='center', va='center')

        plt.xticks([])
        plt.yticks([])
        plt.gca().invert_yaxis()
        plt.show()



# Test initialization
env = DotsAndBoxesEnv()
for _ in range(10):  # Run 10 episodes
    obs = env.reset()
    done = False
    while not done:
        action = env.action_space.sample()  # Random action
        obs, reward, done, _ = env.step(action)
        print("Observation shape:", obs.shape)
        print("Reward:", reward)
        print("Done:", done)


from stable_baselines3 import DQN

# Instantiate the agent
model = DQN("MlpPolicy", env, verbose=1)

# Train the agent
model.learn(total_timesteps=10000)

# Save the trained model
model.save("dots_and_boxes_model")

# Load the saved model
model = DQN.load("dots_and_boxes_model")

# Create the environment
env = DotsAndBoxesEnv(size=3)

# Play one episode
obs = env.reset()
done = False
while not done:
    action, _states = model.predict(obs)
    obs, reward, done, info = env.step(action)
    done = False
    env.render()  # Render the game state
