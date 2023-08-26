import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { Game, startGame } from './game';

function App() {

  const [game, setGame] = useState<Game | null>(null);
  // const [status, setStatus] = useState<string | null>(null);
  const startGameHandler = () => {
    setGame(startGame());
  };
  const showOptions = !game;

  const calcStatus = useMemo(() => {
    console.log('calcing status')
    if (!game) return null;
    const player1Score = game.squares.flat().filter((s) => s === 1).length;
    const player2Score = game.squares.flat().filter((s) => s === 2).length;
    if (game.isGameOver()) {

      if (player1Score > player2Score) {
        return "YOU WON!";
      } else if (player1Score < player2Score) {
        return "YOU SUCK";
      } else {
        return "It's a tie!";
      }
    } else if (player1Score === 0 && player2Score === 0) {
      return `Game on! ${game.humanTurn ? 'You start' : 'Computer starts!'}`;
    } else {
      return game.humanTurn ? 'Your turn' : 'Computer turn';
    }


  }, [game?.hlines, game?.vlines]);
  return (
    <>
      <h1 id="game-title">Dots and Boxes</h1>
      {
        showOptions && (
          <div id="options">
            <label htmlFor="grid-size">Grid Size:</label>
            <select id="grid-size">
              <option value="3">3x3</option>
              <option value="4">4x4</option>
              <option value="5">5x5</option>
            </select>
            <button id="start-button" onClick={startGameHandler}>Start Game</button>
          </div>
        )
      }
      <div id="game-section" style={{ display: game ? 'block' : 'none' }}>
        <h2 id="game-status">{calcStatus}</h2>
        <canvas id="game-canvas"></canvas>
        <div className="button-container">
          <button id="reset-game" onClick={startGameHandler}>Reset Game</button>
          <button id="go-home" onClick={() => setGame(null)}>Go Home</button>
        </div>
      </div>
    </>
  )
}

export default App