const WebSocket = require("ws");
const handleClientMessage = require("./handlers/handle-client-message");
const handleCodeRunnerResponse = require("./handlers/handle-code-runner-response");

/**
 * Sets up WebSocket forwarding between the client and the CodeRunner service.
 * @param {WebSocket} clientWs - The WebSocket connection with the client.
 * @param {string} sessionId - The session ID for the current user.
 * @param {Map} userSessions - A map of active user sessions.
 */
function setupForwarding(clientWs, sessionId, userSessions) {
  let codeRunnerWs = userSessions.get(sessionId);

  const initializeCommunication = () => {
    forwardMessages(codeRunnerWs, clientWs, "codeRunner", sessionId);
    forwardMessages(clientWs, codeRunnerWs, "client", sessionId);

    setupCloseHandlers(clientWs, codeRunnerWs, sessionId, userSessions);
    setupPing(clientWs, codeRunnerWs);
  };

  if (!codeRunnerWs || codeRunnerWs.readyState !== WebSocket.OPEN) {
    codeRunnerWs = new WebSocket("ws://localhost:8080/run");

    codeRunnerWs.on("open", () => {
      userSessions.set(sessionId, codeRunnerWs);
      initializeCommunication();
    });

    codeRunnerWs.on("error", (err) => {
      clientWs.close(1011, "Connection to CodeRunner failed");
    });
  } else {
    initializeCommunication();
  }
}

/**
 * Forwards messages between two WebSocket connections.
 * @param {WebSocket} fromWs - The source WebSocket connection.
 * @param {WebSocket} toWs - The destination WebSocket connection.
 * @param {string} fromType - The type of the source WebSocket ("client" or "codeRunner").
 * @param {string} sessionId - The session ID for the current user.
 */
function forwardMessages(fromWs, toWs, fromType, sessionId) {
  fromWs.on("message", (msg) => {
    const text = msg.toString();

    if (
      fromWs.readyState !== WebSocket.OPEN ||
      toWs.readyState !== WebSocket.OPEN
    ) {
      console.warn(`WebSocket not open: ${fromType} -> ${text}`);
      return;
    }

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${sessionId}] ${fromType} -> ${text}`);

    let responseText = text;
    if (fromType === "codeRunner") {
      responseText = handleCodeRunnerResponse(text);
    } else if (fromType === "client") {
      responseText = handleClientMessage(text);
    }

    if (responseText) toWs.send(responseText);
  });
}

/**
 * Sets up handlers to clean up resources when WebSocket connections are closed.
 * @param {WebSocket} clientWs - The WebSocket connection with the client.
 * @param {WebSocket} codeRunnerWs - The WebSocket connection with the CodeRunner.
 * @param {string} sessionId - The session ID for the current user.
 * @param {Map} userSessions - A map of active user sessions.
 */
function setupCloseHandlers(clientWs, codeRunnerWs, sessionId, userSessions) {
  const cleanup = () => {
    userSessions.delete(sessionId);
    if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
    if (codeRunnerWs.readyState === WebSocket.OPEN) codeRunnerWs.close();
  };

  clientWs.on("close", cleanup);
  codeRunnerWs.on("close", cleanup);
}

/**
 * Sets up periodic ping messages to keep WebSocket connections alive.
 * @param {WebSocket} clientWs - The WebSocket connection with the client.
 * @param {WebSocket} codeRunnerWs - The WebSocket connection with the CodeRunner.
 */
function setupPing(clientWs, codeRunnerWs) {
  const pingInterval = setInterval(() => {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.ping();
    if (codeRunnerWs.readyState === WebSocket.OPEN) codeRunnerWs.ping();
  }, 30000);

  const cleanup = () => clearInterval(pingInterval);
  clientWs.on("close", cleanup);
  codeRunnerWs.on("close", cleanup);
}

module.exports = setupForwarding;
