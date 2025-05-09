const mongoose = require('mongoose');

const TaskSource = new mongoose.Schema({ 
    path: String, content: String
});
const MessageElement = new mongoose.Schema({ 
    role: String, 
    content: String,
    original: String,
    hide: Boolean
});

module.exports = mongoose.model('CodeReview', {
    sources: {
        type: [TaskSource],
        required: true
    },
    samples: {
        type: [TaskSource],
        required: true
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
    reviewStarted: {
        type: Number,
        required: true
    },
    lastModification: {
        type: Number,
        required: true
    },
    success: {
        type: Boolean,
        required: true
    },
    systemPrompt: {
        type: String,
        required: true
    },
    messages: {
        type: [MessageElement],
        required: true
    },
    accessId: {
        type: String,
        required: true
    },
});