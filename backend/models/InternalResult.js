const mongoose = require('mongoose');

const InternalResultSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    // Scheme used for this record ('2019' or '2024')
    scheme: { type: String, default: '2019' },

    // Raw input marks (2019 scheme)
    attendancePercentage: { type: Number, default: 0 },
    test1: { type: Number, default: 0 },
    test2: { type: Number, default: 0 },
    assignment1: { type: Number, default: 0 },
    assignment2: { type: Number, default: 0 },

    // Raw input marks (2024 scheme)
    series1: { type: Number, default: 0 }, // Series 1 out of 40
    series2: { type: Number, default: 0 }, // Series 2 out of 40

    // Calculated finals (2019 scheme)
    internalAttendance: { type: Number, default: 0 }, // Out of 10
    internalTests: { type: Number, default: 0 }, // Out of 25
    internalAssignments: { type: Number, default: 0 }, // Out of 15
    total: { type: Number, default: 0 }, // Out of 50 (2019) or 40 (2024)

    // Calculated finals (2024 scheme)
    internalSeries: { type: Number, default: 0 }, // Out of 20

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
    }
}, { timestamps: true });

// Ensure a student can only have one internal result per subject
InternalResultSchema.index({ student: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('InternalResult', InternalResultSchema);
