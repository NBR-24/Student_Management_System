const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
    registerId: {
        type: String, // To link with PDF data even if student doesn't exist yet
        required: true,
        index: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Can be populated later
    },
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        required: false
    },
    type: {
        type: String,
        enum: ['university', 'series', 'University'], // Allow capitalized 'University' just in case
        required: true,
        default: 'university'
    },
    title: {
        type: String, // e.g. "Semester 1" or "Series Test 1"
        required: false
    },
    subjects: [{
        subCode: String,
        name: String,
        marks: Number,
        maxMarks: Number,
        grade: String
    }],
    publishedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    date: {
        type: Date,
        default: Date.now
    },
    published: {
        type: Boolean,
        default: true
    },
    sgpa: {
        type: Number,
        default: 0
    },
    totalCredits: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Result', ResultSchema);
