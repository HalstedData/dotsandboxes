import { useMemo, useRef, useState } from 'react'
import './App.css'
import Game from './Game';

type Opponent = 'computer' | 'human';
type GameInProgress = {
  gridSize: number;
  opponent: Opponent;
}

function App() {
  const [gameInProgress, setGameInProgress] = useState<GameInProgress | null>(null);
  const startGameHandler = () => {
    const gridSize = Number((document.getElementById("grid-size") as HTMLSelectElement).value);
    const opponent = (document.getElementById("grid-size") as HTMLSelectElement).value as Opponent;
    setGameInProgress({
      gridSize,
      opponent
    });
  };

  return (
    <>
      <h1 id="game-title">Dots and Boxes</h1>
      {
        !gameInProgress && (
          <div id="options">
            <label htmlFor="grid-size">Grid Size:</label>
            <select id="grid-size">
              <option value="3">3x3</option>
              <option value="4">4x4</option>
              <option value="5">5x5</option>
            </select><br />
            <label htmlFor="opponent">Opponent:</label>
            <select id="opponent">
              <option value="computer">Computer</option>
              <option value="human">Human</option>
            </select><br />
            <button id="start-button" onClick={startGameHandler}>Start Game</button>
          </div>
        )
      }
      {gameInProgress && <Game {...gameInProgress} onReset={() => { }} onGoHome={() => { }} />}

    </>
  )
}

export default App
