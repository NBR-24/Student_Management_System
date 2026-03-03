const mongoose = require('mongoose');
const Batch = require('./models/Batch');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/test');
        console.log('Connected to DB');

        const batches = await Batch.find({}).sort({ createdAt: -1 });
        console.log(`\nFound ${batches.length} batches:`);

        batches.forEach(b => {
            console.log(`- Name: ${b.name} | Scheme: ${b.scheme} | Branch: ${b.branch} | ID: ${b._id}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
