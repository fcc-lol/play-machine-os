const API_URL = {
  // local: "http://localhost:3205/api",
  local: "https://play-machine-server.noshado.ws/api",
  production: "https://play-machine-server.noshado.ws/api"
};

const SOCKET_URL = {
  // local: "ws://localhost:3103",
  local: "wss://play-machine-server.noshado.ws",
  production: "wss://play-machine-server.noshado.ws"
};

export { API_URL, SOCKET_URL };
