const mongoose = require('mongoose');
const Result = require('./models/Result');
const User = require('./models/User');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_management_system');
        console.log('Connected to DB');

        const results = await Result.find({}).limit(5);
        console.log('Total Results:', await Result.countDocuments());
        console.log('Sample Results:', JSON.stringify(results, null, 2));

        if (results.length > 0) {
            const studentId = results[0].student;
            if (studentId) {
                const student = await User.findById(studentId);
                console.log('Linked Student:', student ? student.name : 'Student ID found but User not found');
            } else {
                console.log('Sample Result has NO linked Student ID');
            }
        }

        const specificUser = await User.findOne({ role: 'student' });
        if (specificUser) {
            console.log(`Checking results for student: ${specificUser.name} (${specificUser.registerId})`);
            const userResults = await Result.find({
                $or: [
                    { student: specificUser._id },
                    { registerId: specificUser.registerId }
                ]
            });
            console.log('Results found for this student:', userResults.length);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
