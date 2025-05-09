const pendingResponses = require("../../../utils/pending-responses-store");

/**
 * Handles the response from the CodeRunner service.
 * Parses the incoming text, checks if the response ID exists in the pending responses,
 * resolves the corresponding promise, and removes the ID from the pending responses.
 *
 * @param {string} text - The response text from the CodeRunner service.
 * @returns {string|undefined} - Returns text to be sent back to the client,
 */
function handleCodeRunnerResponse(text) {
  try {
    const parsed = JSON.parse(text);

    if (parsed.id && pendingResponses.has(parsed.id)) {
      const { resolve } = pendingResponses.get(parsed.id);
      pendingResponses.delete(parsed.id);
      resolve({ status: 200, success: parsed.success || false });
    }

    // Check if the response contains an error about session retrieval 
    if (
      parsed.error &&
      String(parsed.error).includes("could not retrieve session")
    ) {
      return JSON.stringify({
        type: parsed.type,
        error:
          "No active terminal session found. Please run the task at least once to initialize a terminal session.\n",
      });
    }

    return text;
  } catch (err) {
    console.error("Error parsing the response from CodeRunner:", err);
  }
}

module.exports = handleCodeRunnerResponse;
