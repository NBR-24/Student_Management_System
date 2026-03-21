const fs = require('fs');
const path = require('path');
const { processedData } = require('./utils/resultProcessor');

async function test() {
    try {
        const filePath = path.join(__dirname, '../university result.pdf');
        const buffer = fs.readFileSync(filePath);
        const result = await processedData(buffer);
        console.log(`Detected: Semester ${result.metadata.semester}, Scheme ${result.metadata.scheme}`);

        // Print first 3 students to verify SGPA
        for (let i = 0; i < Math.min(3, result.rawStudents.length); i++) {
            const s = result.rawStudents[i];
            console.log(`Student ${s.registerId} | SGPA: ${s.sgpa} | Credits: ${s.totalCredits} | Pass: ${s.isPass}`);
            console.log(`  Grades: ${JSON.stringify(s.grades)}`);
        }
    } catch (e) {
        console.error(e);
    }
}
test();
