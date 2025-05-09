const Measurement = require('../../model/measurement')

module.exports = {
    addMeasurement: async (type, userRef, customRef, collectionRef, taskRef, accessRef) => {
        const measure = new Measurement({ userRef, collectionRef, taskRef, customRef, accessRef, time: new Date().getTime(), type: type });
        await measure.save();
    }
}