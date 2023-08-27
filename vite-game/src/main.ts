import './style.css'
// import typescriptLogo from './typescript.svg'
// import viteLogo from '/vite.svg'
import { setupGame } from './game.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <h1 id="game-title">Dots and Boxes v2.3</h1>
  <div id="options">
    <label for="grid-size">Grid Size:</label>
    <select id="grid-size">
      <option value="3">3x3</option>
      <option value="4">4x4</option>
      <option value="5">5x5</option>
    </select>
    <button id="start-button">Start Game</button>
  </div>
  <div id="game-section">
    <h2 id="game-status">Game on!</h2>
    <canvas id="game-canvas"></canvas>
    <div class="button-container">
      <button id="reset-game">Reset Game</button>
      <button id="go-home">Go Home</button>
    </div>
  </div>
`

setupGame()