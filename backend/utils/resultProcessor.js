const pdf = require('pdf-parse');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// --- CONSTANTS ---
const GRADE_POINTS = {
    'S': 10, 'A+': 9, 'A': 8.5, 'B+': 8, 'B': 7.5, 'C+': 7, 'C': 6.5, 'D': 6,
    'P': 5.5, 'PASS': 5.5, 'F': 0, 'FE': 0, 'I': 0, 'ABSENT': 0, 'WITHHELD': 0
};

// --- LOGIC HELPERS ---

const detectMetadata = (text) => {
    // Detect Semester
    const semMatch = text.match(/\b(S[1-8])\b|SEMESTER\s+([IVX]+|[1-8])/i);
    let semester = "S1";
    if (semMatch) {
        if (semMatch[1]) {
            semester = semMatch[1].toUpperCase();
        } else {
            const found = semMatch[2].toUpperCase();
            const romanMap = { "I": "S1", "II": "S2", "III": "S3", "IV": "S4", "V": "S5", "VI": "S6", "VII": "S7", "VIII": "S8" };
            semester = romanMap[found] || `S${found}`;
        }
    }

    // Detect Scheme
    let scheme = "2019";
    if (text.includes("2024")) {
        scheme = "2024";
    }

    // Extract the full exam title line from the PDF header
    // Matches lines like: "B.Tech S2 (R) Exam May 2025 (2024 Scheme)"
    // or "B.Tech S3 Supplementary Examination November 2024 (2019 Scheme)"
    let examTitle = null;
    const titleMatch = text.match(/B\.Tech[^\n\r]+(?:Exam|Examination)[^\n\r]*/i);
    if (titleMatch) {
        examTitle = titleMatch[0].replace(/\s+/g, ' ').trim();
    }

    // Fallback if pattern not found
    if (!examTitle) {
        examTitle = `B.Tech ${semester} University Examination (${scheme} Scheme)`;
    }

    // Keep a short examName for Excel header use
    const examName = examTitle;

    return { semester, scheme, examName, examTitle };
};

const getCourseCredits = (code, lookup) => {
    const clean = code.replace(/\s/g, "");
    if (lookup[clean]) return lookup[clean];

    // Wildcard matching (e.g. PCXXT205)
    for (const pattern in lookup) {
        if (pattern.includes('X')) {
            // Replace X with . (dot) for regex matching
            const regexStr = "^" + pattern.replace(/X/g, '.') + "$";
            const regex = new RegExp(regexStr);
            if (regex.test(clean)) {
                return lookup[pattern];
            }
        }
    }

    // Heuristic Fallback
    if (clean.startsWith('MCN') || clean.startsWith('HUN')) return 0; // Mandatory Non Credit
    if (clean.includes('L') && !clean.startsWith('HUT')) return 2; // Labs
    if (clean.endsWith('01') || clean.endsWith('03') || clean.endsWith('05')) return 4; // Core subjects
    return 3; // Default 3 credits
};

const processedData = async (buffer) => {
    try {
        const data = await pdf(buffer);
        const fullText = data.text;

        // DEBUG: Write text to file
        fs.writeFileSync(path.join(__dirname, '../debug_pdf_text.txt'), fullText);

        // Extract Metadata from first 1000 chars roughly
        const headerText = fullText.substring(0, 1500);
        const { semester, scheme, examName, examTitle } = detectMetadata(headerText);

        console.log(`Detected: ${semester} | ${scheme} | ${examName} | ${examTitle}`);

        // Load Credit Config
        const jsonPath = path.join(__dirname, `../credits_${scheme}.json`);
        let fullJsonData = {};
        try {
            const raw = fs.readFileSync(jsonPath);
            fullJsonData = JSON.parse(raw);
        } catch (e) {
            console.warn(`Credit file not found for scheme ${scheme}, using empty defaults.`);
        }

        // --- Build Semester Totals Map ---
        let semesterTotals = fullJsonData.semester_total_credits || {};

        // 2019 Scheme does not have a global semester_total_credits map
        // We need to extract it from the first available department if missing
        if (Object.keys(semesterTotals).length === 0 && fullJsonData.departments) {
            const firstDept = fullJsonData.departments[0];
            if (firstDept && firstDept.semesters) {
                firstDept.semesters.forEach(s => {
                    // Convert integer semester to "S1", "S2" format
                    const semKey = `S${s.semester}`;
                    semesterTotals[semKey] = s.total_credit;
                });
            }
        }

        // Also ensure 2024 integer keys (if any) are mapped to S-prefix if needed, 
        // though 2024 file seems to use "S1" keys in global map.


        // --- Build Credit Lookup ---
        const creditLookup = {};

        // Handle 2024 "curricula" vs 2019 "departments"
        const curriculaList = fullJsonData.curricula || fullJsonData.departments || [];

        curriculaList.forEach(dept => {
            (dept.semesters || []).forEach(sem => {
                (sem.courses || []).forEach(course => {
                    // Normalize keys: 2024 uses "code"/"credits", 2019 uses "course_code"/"credit"
                    const code = course.code || course.course_code;
                    const credit = course.credits || course.credit;

                    if (code) {
                        const cleanCode = code.replace(/\s/g, "");
                        creditLookup[cleanCode] = credit;
                    }
                });
            });
        });

        const rawStudents = [];

        // Matches "PKD24CE001" or "PKD19CS001" etc.
        const regNoPattern = /(PKD\d{2}([A-Z]{2})\d{3})/g; // Modified to standard regex object for exec loop

        // Matches "CODE(GRADE)" e.g. "MAT101(A+)" or "EST 130(B)"

        let match;
        const studentIndices = [];
        while ((match = regNoPattern.exec(fullText)) !== null) {
            studentIndices.push({
                regNo: match[1],
                dept: match[1].substring(5, 7), // e.g. CS from PKD19CS001
                start: match.index,
                end: 0
            });
        }

        // Determine end indices
        for (let i = 0; i < studentIndices.length; i++) {
            if (i < studentIndices.length - 1) {
                studentIndices[i].end = studentIndices[i + 1].start;
            } else {
                studentIndices[i].end = fullText.length;
            }
        }

        for (const student of studentIndices) {
            const block = fullText.substring(student.start, student.end).replace(/\n/g, ' ');

            // Extract Grades
            const courseGradePattern = /([A-Z]{3,}\d{3})\s*\(([^)]+)\)/g;
            const grades = {};
            let gMatch;
            while ((gMatch = courseGradePattern.exec(block)) !== null) {
                grades[gMatch[1]] = gMatch[2].trim().toUpperCase().replace(/\s/g, '');
            }

            if (Object.keys(grades).length > 0) {
                // --- SGPA CALCULATION (Fixed Denominator) ---
                let totalWeightedPoints = 0;
                let totalCreds = 0; // Earned Credits

                // Denominator Logic: Use fixed value from JSON
                let officialDenom = semesterTotals[semester] || 0;

                // Fallback / Validation
                if (officialDenom === 0) {
                    // Try to guess or warn? For now, we stick to the user instruction: "i have given fixed credit in json"
                    // If 0, SGPA will be 0/NaN potentially.
                    if (scheme === "2024" && semester === "S2") officialDenom = 24; // Hardcoded fallback if JSON fails/is missing
                    else officialDenom = 21; // Robust fallback
                }


                const failGrades = ['F', 'FE', 'I', 'ABSENT', 'WITHHELD'];
                const isPass = !Object.values(grades).some(g => failGrades.includes(g));

                for (const [code, grade] of Object.entries(grades)) {
                    const creds = getCourseCredits(code, creditLookup);
                    const gp = GRADE_POINTS[grade] || 0;

                    totalWeightedPoints += (creds * gp);

                    if (gp > 0) {
                        totalCreds += creds;
                    }
                }


                let sgpa = 0.0;
                if (officialDenom > 0) {
                    sgpa = parseFloat((totalWeightedPoints / officialDenom).toFixed(2));
                }


                rawStudents.push({
                    registerId: student.regNo,
                    dept: student.dept,
                    grades: grades,
                    sgpa: sgpa,
                    totalCredits: totalCreds,
                    isPass: isPass
                });
            }
        }

        return { rawStudents, metadata: { semester, scheme, examName, examTitle } };

    } catch (error) {
        console.error("Processing Error:", error);
        const fs = require('fs');
        const path = require('path');
        try {
            fs.appendFileSync(path.join(__dirname, '../debug_error.log'), `${new Date().toISOString()} - Processing Error: ${error.message}\n${error.stack}\n\n`);
        } catch (e) { console.error("Could not write to log file", e); }
        throw error;
    }
};

const generateExcel = async (processedData) => {
    const { rawStudents, metadata } = processedData;
    const { examName, semester, scheme } = metadata;

    const workbook = new ExcelJS.Workbook();

    // Group by Dept
    const deptBuckets = {};
    rawStudents.forEach(s => {
        if (!deptBuckets[s.dept]) deptBuckets[s.dept] = [];
        deptBuckets[s.dept].push(s);
    });

    const sortedDepts = Object.keys(deptBuckets).sort();

    for (const dept of sortedDepts) {
        const studentList = deptBuckets[dept];
        const sheetName = `${dept}_Analysis`;
        const worksheet = workbook.addWorksheet(sheetName);

        // Metadata Header
        worksheet.mergeCells('A1:E1');
        worksheet.getCell('A1').value = `EXAMINATION: ${examName}`;
        worksheet.getCell('A1').font = { bold: true, size: 12 };

        worksheet.mergeCells('A2:E2');
        worksheet.getCell('A2').value = `SEMESTER: ${semester} | SCHEME: ${scheme}`;
        worksheet.getCell('A2').font = { bold: true, size: 11 };

        worksheet.mergeCells('A3:E3');
        worksheet.getCell('A3').value = `DEPARTMENT: ${dept}`;
        worksheet.getCell('A3').font = { bold: true, size: 11 };

        // Statistics
        const totalS = studentList.length;
        const passS = studentList.filter(s => s.isPass).length;
        const failS = totalS - passS;
        const passPerc = totalS > 0 ? ((passS / totalS) * 100).toFixed(2) : 0;

        worksheet.mergeCells('A5:E5');
        worksheet.getCell('A5').value = "OVERALL PERFORMANCE ANALYSIS";
        worksheet.getCell('A5').font = { bold: true, color: { argb: 'FF000000' } };

        worksheet.mergeCells('A6:E6');
        worksheet.getCell('A6').value = `Total Students: ${totalS} | Pass: ${passS} | Fail: ${failS} | Pass%: ${passPerc}%`;
        worksheet.getCell('A6').font = { bold: true };

        // Collect all distinct courses for this department
        const allCourses = new Set();
        studentList.forEach(s => Object.keys(s.grades).forEach(c => allCourses.add(c)));
        const deptCourses = Array.from(allCourses).sort();

        // Table Header
        const headerRow = ['Register No', ...deptCourses, 'Total Credits', 'SGPA', 'Result'];
        const tableStartRow = 9;
        const headerCellRow = worksheet.getRow(tableStartRow);
        headerCellRow.values = headerRow;
        headerCellRow.font = { bold: true };

        // Data Rows
        studentList.forEach((s, idx) => {
            const rowData = [s.registerId];
            deptCourses.forEach(c => {
                rowData.push(s.grades[c] || '-');
            });
            rowData.push(s.totalCredits);
            rowData.push(s.sgpa);
            rowData.push(s.isPass ? 'PASS' : 'FAIL');

            const row = worksheet.getRow(tableStartRow + 1 + idx);
            row.values = rowData;

            // Conditional Formatting for Result
            const resultColIndex = rowData.length;
            const resultCell = row.getCell(resultColIndex);
            if (s.isPass) {
                resultCell.font = { color: { argb: 'FF008000' }, bold: true }; // Green
            } else {
                resultCell.font = { color: { argb: 'FFFF0000' }, bold: true }; // Red
            }
        });

        const lastRow = tableStartRow + 1 + studentList.length;

        // --- Toppers Analysis ---
        let currentRow = lastRow + 3;
        worksheet.getCell(`A${currentRow}`).value = "TOP 10 PERFORMERS";
        worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FF0000FF' } }; // Blue

        const toppers = studentList.filter(s => s.isPass).sort((a, b) => b.sgpa - a.sgpa).slice(0, 10);
        toppers.forEach((t, i) => {
            currentRow++;
            worksheet.getCell(`A${currentRow}`).value = `${i + 1}. ${t.registerId}`;
            worksheet.getCell(`B${currentRow}`).value = `SGPA: ${t.sgpa}`;
        });

        // --- Subject Failure Analysis ---
        currentRow += 2;
        worksheet.getCell(`A${currentRow}`).value = "SUBJECT-WISE FAILURE ANALYSIS";
        worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FFFF0000' } }; // Red

        deptCourses.forEach((code, i) => {
            currentRow++;
            const failCount = studentList.filter(s => {
                const g = s.grades[code];
                return g && ['F', 'FE', 'I', 'ABSENT'].includes(g);
            }).length;

            worksheet.getCell(`A${currentRow}`).value = code;
            worksheet.getCell(`B${currentRow}`).value = `${failCount} Failed`;
        });
    }

    // Return buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};

module.exports = { processedData, generateExcel };
