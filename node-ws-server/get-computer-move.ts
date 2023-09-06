import { GameV2State, Line, ServerGameV2 } from "../commonts/types";

export default async function getComputerMove({ meta, state, }: ServerGameV2): Promise<Line> {

  const data = {
    hlines: state.hlines,
    vlines: state.vlines,
    gridSize: meta.gridSize,
  };

  // const { host } = window.location;
  // const inDevMode = ['127.0.0.1', 'localhost'].some(h => host.includes(h));
  const requestHost = true ? 'http://127.0.0.1:5000' : 'https://chiefsmurph.com/dotsandboxes';

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
