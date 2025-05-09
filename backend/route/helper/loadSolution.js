const debug = require('debug')('coding:routes:helper:load-solutions')

const Solution = require('../../model/solution')

const EMPTY_SOLUTION_SOURCES = {};
module.exports = async (userRef, collectionRef, taskRef) => {
    if(!userRef) {
        return EMPTY_SOLUTION_SOURCES;
    }
    let solution = await Solution.findOne({userRef, collectionRef, taskRef}).exec();
    if(solution && solution.sources) {
        debug(`Found persisted solutions for user ${userRef} in task ${collectionRef}[${taskRef}]`)
        return {
            sources: solution.sources.map(el => ({path: el.path, content: el.content})),
            testsOk: solution.testsOk,
            thumbUps: solution.thumbUps.length,
            usedSamples: solution.usedSamples
        };
    }
    return EMPTY_SOLUTION_SOURCES;
};