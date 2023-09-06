import axios from "axios";
import { GameV2State, Line, ServerGameV2 } from "../commonts/types";

export default async function getComputerMove({ meta, state, }: ServerGameV2): Promise<Line> {

  const data = {
    hlines: state.hlines,
    vlines: state.vlines,
    gridSize: meta.gridSize,
  };

  // const { host } = window.location;
  // const inDevMode = ['127.0.0.1', 'localhost'].some(h => host.includes(h));
  const requestHost = false ? 'http://127.0.0.1:5000' : 'http://38.108.119.159:5000'// 'https://chiefsmurph.com/dotsandboxes';

  const response = await axios.post<{computer_move: Line }>(
    `${requestHost}/get-computer-move`,
    data
  );

  return response.data.computer_move;
}
