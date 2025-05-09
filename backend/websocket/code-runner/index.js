const WebSocket = require("ws");
const handleUpgrade = require("./upgrade-handler");
const sessionHandler = require("./session-handler");
const setupForwarding = require("./forwarder");

/**
 * Sets up a WebSocket server for the code runner and integrates it with the provided HTTP server.
 *
 * @param {import('http').Server} server - The HTTP server to attach the WebSocket server to.
 * @param {import('express-session').Store} sessionStore - The session store used to manage user sessions.
 * @param {Map<string, WebSocket>} userSessions - A map of user session data for tracking active users.
 */
function setupCodeRunnerWebSocket(server, sessionStore, userSessions) {
  const wss = new WebSocket.Server({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    handleUpgrade(req, socket, head, wss);
  });

  wss.on("connection", async (clientWs, req) => {
    const sessionId = await sessionHandler.extractValidSessionId(req, clientWs);
    if (!sessionId) {
      return clientWs.close(1008, "Invalid session");
    }

    const sessionData = await sessionHandler.getSessionData(
      sessionStore,
      sessionId
    );
    if (!sessionData) {
      return clientWs.close(1008, "No session found");
    }

    setupForwarding(clientWs, sessionId, userSessions);
  });
}

module.exports = setupCodeRunnerWebSocket;
