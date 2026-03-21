const mongoose = require('mongoose');
const Result = require('./models/Result');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/test');
        console.log('Connected to DB');

        const results = await Result.find({}).sort({ createdAt: -1 }).limit(5);

        console.log(`\nFound ${await Result.countDocuments()} total results.`);
        console.log(`Displaying last ${results.length} results:`);

        results.forEach(r => {
            console.log('------------------------------------------------');
            console.log(`ID: ${r._id}`);
            console.log(`RegisterID: ${r.registerId}`);
            console.log(`Type: ${r.type}`);
            console.log(`Title: ${r.title}`);
            console.log(`Batch ID: ${r.batch}`);
            console.log(`Student ID: ${r.student}`);
            console.log(`Subjects: ${r.subjects.length} subjects found`);
            console.log(`Example Subject: ${r.subjects.length > 0 ? r.subjects[0].subCode + ' (' + r.subjects[0].grade + ')' : 'None'}`);
            console.log(`CreatedAt: ${r.createdAt}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
