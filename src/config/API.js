const API_URL = {
  local: "http://localhost:3205/api",
  production: "https://play-machine-server.noshado.ws/api"
};

const SOCKET_URL = {
  local: "ws://localhost:3103",
  production: "wss://play-machine-server.noshado.ws"
};

export { API_URL, SOCKET_URL };
