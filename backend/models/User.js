const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: function () { return this.role === 'admin' || this.role === 'teacher'; },
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: true
    },
    department: {
        type: String, // Specific to teachers
    },
    role: {
        type: String,
        enum: ['admin', 'teacher', 'student', 'exam_controller', 'hod'],
        required: true
    },
    // Specific to students
    admissionNo: {
        type: String,
        unique: true,
        sparse: true
    },
    registerId: {
        type: String, // Used as password initially, but stored hashed
    },
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch'
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
