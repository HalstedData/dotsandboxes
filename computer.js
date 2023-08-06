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
    'http://38.108.119.159:5000/get-computer-move',
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
  