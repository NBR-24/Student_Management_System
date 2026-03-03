const mongoose = require('mongoose');
const User = require('./models/User');
const Result = require('./models/Result');
require('dotenv').config();

const run = async () => {
    try {
        // Connect to the same DB as the server
        const dbPath = './data/db'; // Assuming embedded, but let's try standard connection first 
        // If server is running on 27017, we can connect via localhost
        await mongoose.connect('mongodb://127.0.0.1:27017/test');
        console.log('Connected to DB');

        console.log('\n--- USERS (Students) ---');
        const students = await User.find({ role: 'student' });
        students.forEach(s => {
            console.log(`Name: ${s.name} | RegID: '${s.registerId}' | ID: ${s._id}`);
        });

        console.log('\n--- RESULTS ---');
        const results = await Result.find({});
        results.forEach(r => {
            console.log(`RegID: '${r.registerId}' | Type: ${r.type} | Title: '${r.title}' | StudentID: ${r.student}`);
        });

        if (students.length > 0 && results.length > 0) {
            console.log('\n--- MATCHING CHECK ---');
            const sampleStudent = students[0];
            const match = results.find(r => r.registerId === sampleStudent.registerId);
            console.log(`Checking for student '${sampleStudent.name}' (RegID: '${sampleStudent.registerId}'):`);
            if (match) {
                console.log(`✅ MATCH FOUND: Result ID ${match._id}`);
            } else {
                console.log(`❌ NO MATCH FOUND. Check for typos or whitespace.`);
                // distinct check
                results.forEach(r => {
                    if (r.registerId.trim().toLowerCase() === sampleStudent.registerId.trim().toLowerCase()) {
                        console.log(`   Detailed Check: Found potential match with different case/spacing: '${r.registerId}'`);
                    }
                });
            }
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
};

run();
