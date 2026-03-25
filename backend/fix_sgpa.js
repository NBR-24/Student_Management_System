const mongoose = require('mongoose');
const Result = require('./models/Result');
const { calculateManualSGPA } = require('./utils/resultProcessor');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/SMS').then(async () => {
    try {
        const resultsToFix = await Result.find({ sgpa: 0, totalCredits: 0 });
        console.log(`Found ${resultsToFix.length} results with 0 SGPA/Credits`);

        let fixedCount = 0;
        for (const res of resultsToFix) {
            if (res.subjects && res.subjects.length > 0) {
                const metrics = calculateManualSGPA(res.subjects, res.title || '');
                if (metrics.sgpa > 0 || metrics.totalCredits > 0) {
                    res.sgpa = metrics.sgpa;
                    res.totalCredits = metrics.totalCredits;
                    await res.save();
                    fixedCount++;
                }
            }
        }
        console.log(`Successfully recalculated and fixed ${fixedCount} results.`);
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
});
