const mongoose = require('mongoose');

const TaskSource = new mongoose.Schema({ 
    path: String, content: String
});

module.exports = mongoose.model('TaskMeasurement', {
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
    accessRef: {
        type: String,
        required: false
    },
    time: {
        type: Number,
        required: false
    },
    type: {
        type: String,
        required: false
    }
});