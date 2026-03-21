const mongoose = require('mongoose');
const Result = require('./models/Result');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/test');
        console.log('Connected to DB');

        const result = await Result.deleteMany({});
        console.log(`Deleted ${result.deletedCount} results. Database is clean.`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
