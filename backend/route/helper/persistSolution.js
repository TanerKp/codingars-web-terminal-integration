const Solution = require('../../model/solution')
const debug = require('debug')('coding:routes:helper:persist-solutions')

module.exports = async (userRef, customRef, collectionRef, taskRef, sources, testsOk, usedSamples) => {
    let data = {
        userRef, collectionRef, taskRef, customRef
    }
    if (testsOk) {
        data.testsOk = true;
        data.testedSources = sources;
    } else if(usedSamples) {
        data.usedSamples = true;
    } else if (sources) {
        data.sources = sources;
        data.lastModification = new Date().getTime();
    }
    await Solution.updateOne({ userRef, collectionRef, taskRef }, data, { upsert: true }).exec();
    debug(`Persisted solution for user ${userRef} in task ${collectionRef}[${taskRef}]`)
};