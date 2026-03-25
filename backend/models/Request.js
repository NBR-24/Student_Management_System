const mongoose = require('mongoose');

const flowStepSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['tutor', 'hod', 'principal'],
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    comment: { type: String },
    actedAt: { type: Date }
}, { _id: false });

const RequestSchema = new mongoose.Schema({
    reqId: {
        type: String,
        unique: true,
        required: true
    },
    type: {
        type: String,
        enum: ['bonafide', 'duty_leave', 'lab_permission', 'custom'],
        required: true
    },
    subject: { type: String, required: true },
    body:    { type: String, required: true },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    flow: [flowStepSchema],
    currentStep: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'reverted'],
        default: 'pending'
    },
    pdfPath: { type: String }   // populated after final approval
}, { timestamps: true });

module.exports = mongoose.model('Request', RequestSchema);
