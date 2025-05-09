/**
 * Extracts a valid session ID from the request's cookies and validates its format.
 * If the session ID is invalid or missing, the WebSocket connection is closed with an appropriate error code.
 *
 * @param {Object} req - The HTTP request object containing headers and cookies.
 * @param {WebSocket} clientWs - The WebSocket connection to the client.
 * @returns {Promise<string|null>} A promise that resolves to the extracted session ID if valid, or `null` if invalid or missing.
 */
async function extractValidSessionId(req, clientWs) {
    return new Promise((resolve) => {
      try {
        const cookies = req.headers.cookie || "";
        const sessionCookie = cookies
          .split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith("codingars.sid="))
          ?.split("=")[1];
  
        if (!sessionCookie) {
          clientWs.close(1008, "No session");
          return resolve(null);
        }
  
        const decoded = decodeURIComponent(sessionCookie);
        const sessionId = decoded.startsWith("s:")
          ? decoded.slice(2).split(".")[0]
          : decoded.split(".")[0];
  
        if (!sessionId) {
          clientWs.close(1008, "Invalid session format");
          return resolve(null);
        }
  
        resolve(sessionId);
      } catch (e) {
        clientWs.close(1011, "Internal error");
        resolve(null);
      }
    });
  }
  
  /**
   * Retrieves session data from the session store using the provided session ID.
   * If the session data is not found or an error occurs, it resolves to `null`.
   *
   * @param {Map} sessionStore - The session store containing session data.
   * @param {string} sessionId - The ID of the session to retrieve.
   * @returns {Promise<Object|null>} A promise that resolves to the session data if found, or `null` if not found or an error occurs.
   */
  async function getSessionData(sessionStore, sessionId) {
    return new Promise((resolve) => {
      try {
        const sessionData = sessionStore.get(sessionId);
        if (!sessionData) {
          resolve(null);
        } else {
          resolve(sessionData);
        }
      } catch (error) {
        resolve(null);
      }
    });
  }
  
  module.exports = {
    extractValidSessionId,
    getSessionData,
  };
  