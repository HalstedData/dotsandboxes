import time
import numpy as np
import pygame
from game_logic import Game, WINDOW_SIZE, SCREEN_SIZE, GRID_SIZE, WHITE

def main():
    pygame.init()
    screen = pygame.display.set_mode(WINDOW_SIZE)
    pygame.display.set_caption("Dots and Boxes")
    clock = pygame.time.Clock()

    game = Game()
    game.box_size = (SCREEN_SIZE - 40) // GRID_SIZE

    running = True
    while running:
        game.square_completed_last_turn = False

        screen.fill(WHITE)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.MOUSEBUTTONDOWN and game.human_turn:
                x, y = event.pos
                game.update_line(x, y - 20)
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_r:  # Reset game logic
                game = Game()  # Reinitialize the game object

        if not game.human_turn:
            game.computer_turn()  # Call the computer_turn method

        game.draw_lines(screen)
        game.display_scores(screen)

        if np.all(game.hlines) and np.all(game.vlines):
            if not game.game_over:
                game.game_over = True
                game.game_end_timer = time.time()

        pygame.display.flip()


if __name__ == "__main__":
    main()
