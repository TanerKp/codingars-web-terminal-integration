const CodeReview = require('../model/review');
const { v4: uuidv4, v4 } = require('uuid')

module.exports = {
    // Create a new code review
    create: async function (sources, samples, userRef, customRef, collectionRef, taskRef, success, systemPrompt, messages) {
        const review = new CodeReview({
            sources,
            samples,
            userRef,
            customRef,
            collectionRef,
            taskRef,
            reviewStarted: Date.now(),
            lastModification: Date.now(),
            success,
            systemPrompt,
            messages,
            accessId: uuidv4() // id to be used for external access
        });

        return await review.save();
    },

    // Get a code review by ID
    get: async function (id) {
        return await CodeReview.findById(id);
    },

    getByAccess: async function (accessId) {
        if (!accessId || typeof accessId !== 'string') {
            throw new Error('Invalid access string');
        }
        
        // Find the document where the accessId matches
        // This assumes you have a field in your schema called 'accessId'
        return await CodeReview.findOne({ accessId });
    },

    getLatest: async function (userRef, collectionRef, taskRef) {
        return await CodeReview
            .findOne({ userRef: userRef, taskRef: taskRef, collectionRef: collectionRef })
            .sort({ reviewStarted: -1 });
    },

    // Update messages of a code review
    update: async function (id, messages) {
        return await CodeReview.findByIdAndUpdate(
            id,
            {
                messages: messages,
                lastModification: Date.now()
            },
            { new: true } // Returns the updated document instead of the old one
        );
    }
}