const mongoose = require('mongoose');

const TaskSource = new mongoose.Schema({ 
    path: String, content: String
});

module.exports = mongoose.model('TaskSolution', {
    sources: {
        type: [TaskSource],
        required: false
    },
    testedSources: {
        type: [TaskSource],
        required: false
    },
    userRef: {
        type: String,
        required: true
    },
    customRef: {
        type: String,
        required: false
    },
    collectionRef: {
        type: mongoose.ObjectId,
        required: true
    },
    taskRef: {
        type: String,
        required: true
    },
    lastModification: {
        type: Number,
        required: true
    },
    testsOk: {
        type: Boolean,
        required: false
    },
    usedSamples: {
        type: Boolean,
        required: false
    },
    thumbUps: {
        type: [String],
        required: false
    }
});