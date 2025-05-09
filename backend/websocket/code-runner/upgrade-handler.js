/**
 * Handles the WebSocket upgrade process for incoming HTTP requests.
 *
 * @param {import('http').IncomingMessage} req - The HTTP request object.
 * @param {import('net').Socket} socket - The network socket between the server and client.
 * @param {Buffer} head - The first packet of the upgraded stream.
 * @param {import('ws').WebSocketServer} wss - The WebSocket server instance.
 */
function handleUpgrade(req, socket, head, wss) {
    if (req.url !== "/ws/run") {
      socket.destroy();
      return;
    }
  
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  }
  
  module.exports = handleUpgrade;
  