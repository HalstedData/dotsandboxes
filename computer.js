async function getComputerMove({
  hlines,
  vlines,
  gridSize,
}) {

  const data = {
    hlines,
    vlines,
    gridSize
  };

  const response = await fetch(
    'http://127.0.0.1:5000/get-computer-move',
    {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  ).then(r => r.json());
  
  return response.computer_move;
}
  