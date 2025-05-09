const config = require('../../config');


/**
 * Determines the minimum value for a score, and converts the value to a Number
 * If the value is invalid, falls back to the default value
 * 
 * @param {Object} taskDetails - Object with optional minScore parameter
 * @param {Object} config - Configuration object with get method
 * @param {Number} [defaultScore=0] - Optional default value if no value is configured
 * @returns {Number} The valid minScore value
 */
const minScoreRatio = (taskDetails, defaultScore = 0) => {
    // First try to get the value from taskDetails
    let score = taskDetails?.minScore;

    // If not present or invalid, try to load from configuration
    if (score === undefined || score === null || isNaN(Number(score))) {
        score = config?.get?.("code-review-min-score", defaultScore);
    }

    // Convert to Number and check validity
    const numberScore = Number(score);

    // If still invalid, return the default value
    if (isNaN(numberScore)) {
        return defaultScore;
    }

    return numberScore;
};

/**
 * Determines the maximum value for a score, and converts the value to a Number
 * If the value is invalid, falls back to the default value
 * 
 * @param {Object} taskDetails - Object with optional maxScore parameter
 * @param {Object} config - Configuration object with get method
 * @param {Number} [defaultScore=0] - Optional default value if no value is configured
 * @returns {Number} The valid maxScore value
 */
const maxScoreTotal = (taskDetails, defaultScore = 10) => {
    // First try to get the value from taskDetails
    let score = taskDetails?.maxScore;

    // If not present or invalid, try to load from configuration
    if (score === undefined || score === null || isNaN(Number(score))) {
        score = config?.get?.("code-review-max-score-total", defaultScore);
    }

    // Convert to Number and check validity
    const numberScore = Number(score);

    // If still invalid, return the default value
    if (isNaN(numberScore)) {
        return defaultScore;
    }

    return numberScore;
};

module.exports = {
    minScoreRatio,
    maxScoreTotal
};