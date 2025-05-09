const userSessions = require("../../../utils/session-store");
const pendingResponses = require("../../../utils/pending-responses-store")
const { v4: uuidv4 } = require("uuid");


function sendRunCommand(sessionId, payload, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const ws = userSessions.get(sessionId);

    if (!ws || ws.readyState !== ws.OPEN) {
      return reject(
        new Error("No active CodeRunner WebSocket for this session")
      );
    }

    // Create a unique message ID for this request
    const msgId = uuidv4();
    const body = {
      id: msgId,
      ...payload,
    };

    // Set up a timeout to reject the promise if no response is received
    const timeoutHandle = setTimeout(() => {
      pendingResponses.delete(msgId);
      reject(new Error("CodeRunner response timeout"));
    }, timeout);

    // Store the resolve and reject functions in the pendingResponses map
    pendingResponses.set(msgId, {
      resolve: (data) => {
        clearTimeout(timeoutHandle);
        resolve(data);
      },
      reject: (err) => {
        clearTimeout(timeoutHandle);
        reject(err);
      },
    });

    ws.send(JSON.stringify(body));
  });
}

module.exports = {
  pendingResponses,
  sendRunCommand,
};
