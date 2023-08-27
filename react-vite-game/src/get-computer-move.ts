import { GameState, Line } from "./Game";

export default async function getComputerMove({ hlines, vlines, gridSize }: GameState): Promise<Line> {

  const data = {
    hlines,
    vlines,
    gridSize,
  };

  const { host } = window.location;
  const inDevMode = !host || host && ['127.0.0.1', 'localhost'].some(h => host.includes(h));
  const requestHost = inDevMode && true ? 'http://127.0.0.1:5000' : 'https://chiefsmurph.com/dotsandboxes';

  const response = await fetch(
    `${requestHost}/get-computer-move`,
    {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  ).then(r => r.json());

  return response.computer_move as Line;
}
