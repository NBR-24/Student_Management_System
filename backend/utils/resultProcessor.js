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

    // Detect Scheme — look for explicit "(YYYY Scheme)" pattern first
    let scheme = "2019"; // default
    const schemeMatch = text.match(/\((\d{4})\s*Scheme\)/i);
    if (schemeMatch) {
        scheme = schemeMatch[1]; // e.g. "2019" or "2024"
    } else if (text.includes("2024 Scheme") || text.includes("Scheme 2024")) {
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
    return 0; // Default if not found
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

        // 2019 Scheme: build semesterTotals from first dept as a generic fallback
        if (Object.keys(semesterTotals).length === 0 && fullJsonData.departments) {
            const firstDept = fullJsonData.departments[0];
            if (firstDept && firstDept.semesters) {
                firstDept.semesters.forEach(s => {
                    semesterTotals[`S${s.semester}`] = s.total_credit;
                });
            }
        }

        // --- Build Credit + Name Lookups (all depts, all semesters) ---
        const creditLookup = {};
        const nameLookup = {}; // code (no spaces) → course name
        const curriculaList = fullJsonData.curricula || fullJsonData.departments || [];
        curriculaList.forEach(dept => {
            (dept.semesters || []).forEach(sem => {
                (sem.courses || []).forEach(course => {
                    const code = course.code || course.course_code;
                    const credit = course.credits || course.credit;
                    const name = course.course_name || null;
                    if (code) {
                        const clean = code.replace(/\s/g, '');
                        creditLookup[clean] = credit;
                        if (name) nameLookup[clean] = name;
                    }
                });
            });
        });

        const rawStudents = [];

        // FIX: Match ALL register number prefixes used in KTU PDFs:
        //   - PKD21IT068   (regular)
        //   - LPKD20IT065  (lateral entry — LP prefix)
        //   - IDK19IT017   (other college — IDK prefix)
        // We always normalise to the PKD... core for storage.
        const regNoPattern = /(?:LP|IDK)?(PKD\d{2}[A-Z]{2,3}\d{3})/g;

        let match;
        const studentIndices = [];
        while ((match = regNoPattern.exec(fullText)) !== null) {
            studentIndices.push({
                regNo: match[1],           // normalised: PKD21IT068
                dept: match[1].substring(5, 7), // e.g. IT
                start: match.index,
                end: 0
            });
        }

        // Determine end indices — each block ends where the next register number starts
        for (let i = 0; i < studentIndices.length; i++) {
            studentIndices[i].end = i < studentIndices.length - 1
                ? studentIndices[i + 1].start
                : fullText.length;
        }

        // Dept section header pattern — appears at the top of each department page in the PDF
        // e.g. "COMPUTER SCIENCE & ENGINEERING[Full Time]" or "Course CodeCourse"
        const deptSectionHeaderPattern = /([A-Z][A-Z &]+(?:ENGINEERING|TECHNOLOGY|SCIENCE)[^\n]*\[|\bCourse\s*Code\s*Course\b)/i;

        for (const student of studentIndices) {
            let rawBlock = fullText.substring(student.start, student.end);

            // FIX: Truncate the block at the next department section header.
            // The last student in a dept section (e.g. IT) will have their block extend into
            // the next dept's header (e.g. CS) before any CS register number appears.
            // We cut the block there to avoid capturing CS course grades.
            const headerMatch = deptSectionHeaderPattern.exec(rawBlock);
            if (headerMatch) {
                rawBlock = rawBlock.substring(0, headerMatch.index);
            }

            const block = rawBlock.replace(/\n/g, ' ');

            // Extract subject grades from this student's block only
            const courseGradePattern = /([A-Z]{3,}\d{3})\s*\(([^)]+)\)/g;
            const grades = {};
            let gMatch;
            while ((gMatch = courseGradePattern.exec(block)) !== null) {
                grades[gMatch[1]] = gMatch[2].trim().toUpperCase().replace(/\s/g, '');
            }

            if (Object.keys(grades).length > 0) {
                // --- CORRECT DENOMINATOR: match by student's actual subject codes ---
                // Look through all depts to find the one whose courses match this student's codes
                let officialDenom = 0;
                if (fullJsonData.departments || fullJsonData.curricula) {
                    const deptList = fullJsonData.departments || fullJsonData.curricula;
                    const semNum = parseInt(semester.replace('S', ''), 10);
                    const studentCodes = new Set(Object.keys(grades).map(c => c.replace(/\s/g, '')));

                    for (const deptData of deptList) {
                        const semData = deptData.semesters?.find(s => s.semester === semNum);
                        if (!semData) continue;

                        const deptCodes = (semData.courses || []).map(c => (c.code || c.course_code || '').replace(/\s/g, ''));
                        const overlap = deptCodes.filter(dc => studentCodes.has(dc)).length;
                        if (overlap > 0) {
                            officialDenom = semData.total_credit;
                            break; // Use first matching dept
                        }
                    }
                }

                // Fallback chain
                if (!officialDenom) officialDenom = semesterTotals[semester] || 0;
                if (!officialDenom) officialDenom = (scheme === '2024' && semester === 'S2') ? 24 : 21;

                const failGrades = ['F', 'FE', 'I', 'ABSENT', 'WITHHELD'];
                const isPass = !Object.values(grades).some(g => failGrades.includes(g));

                let totalWeightedPoints = 0;
                let totalCreds = 0;

                // Build enriched subjects array with course names
                const subjects = [];
                for (const [code, grade] of Object.entries(grades)) {
                    const cleanCode = code.replace(/\s/g, '');
                    const creds = getCourseCredits(cleanCode, creditLookup);
                    const gp = GRADE_POINTS[grade] || 0;
                    const name = nameLookup[cleanCode] || code; // fallback to code if no name
                    totalWeightedPoints += creds * gp;
                    if (gp > 0) totalCreds += creds;
                    subjects.push({ code, name, grade, credit: creds, gradePoints: gp });
                }

                let sgpa = officialDenom > 0
                    ? parseFloat((totalWeightedPoints / officialDenom).toFixed(2))
                    : 0.0;

                // Sanity cap — SGPA can never exceed 10
                if (sgpa > 10) {
                    console.warn(`[WARN] SGPA ${sgpa} capped for ${student.regNo} (denom=${officialDenom}, pts=${totalWeightedPoints})`);
                    sgpa = 10.0;
                }

                rawStudents.push({
                    registerId: student.regNo,
                    dept: student.dept,
                    grades,     // kept for backward compatibility
                    subjects,   // enriched: [{code, name, grade, credit, gradePoints}]
                    sgpa,
                    totalCredits: totalCreds,
                    isPass
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

        // Collect all distinct courses for this dept + build code→name map for headers
        const allCourses = new Set();
        const codeToName = {};
        studentList.forEach(s => {
            (s.subjects || []).forEach(sub => {
                allCourses.add(sub.code);
                if (sub.name && sub.name !== sub.code) codeToName[sub.code] = sub.name;
            });
        });
        const deptCourses = Array.from(allCourses).sort();

        // Table Header — show "CODE – Course Name" if name is available
        const headerRow = [
            'Register No',
            'Student Name',
            ...deptCourses.map(c => codeToName[c] ? `${c} – ${codeToName[c]}` : c),
            'Total Credits', 'SGPA', 'Result'
        ];
        const tableStartRow = 9;
        const headerCellRow = worksheet.getRow(tableStartRow);
        headerCellRow.values = headerRow;
        headerCellRow.font = { bold: true };

        // Data Rows
        studentList.forEach((s, idx) => {
            const rowData = [
                s.registerId,
                s.name || '-',   // Student Name (from DB lookup if available)
            ];
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
            worksheet.getCell(`C${currentRow}`).value = t.name || '';
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

            // Show "CODE – Course Name" in failure analysis too
            const label = codeToName[code] ? `${code} – ${codeToName[code]}` : code;
            worksheet.getCell(`A${currentRow}`).value = label;
            worksheet.getCell(`B${currentRow}`).value = `${failCount} Failed`;
        });
    }

    // Return buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};

const calculateManualSGPA = (subjects, title) => {
    // 1. Detect Metadata
    const { semester, scheme } = detectMetadata(title);

    // 2. Load JSON
    const jsonPath = path.join(__dirname, `../credits_${scheme}.json`);
    let fullJsonData = {};
    try {
        const raw = fs.readFileSync(jsonPath);
        fullJsonData = JSON.parse(raw);
    } catch (e) {
        console.warn(`Credit file not found for scheme ${scheme}, using empty defaults.`);
    }

    let semesterTotals = fullJsonData.semester_total_credits || {};
    if (Object.keys(semesterTotals).length === 0 && fullJsonData.departments) {
        const firstDept = fullJsonData.departments[0];
        if (firstDept && firstDept.semesters) {
            firstDept.semesters.forEach(s => {
                semesterTotals[`S${s.semester}`] = s.total_credit;
            });
        }
    }

    const creditLookup = {};
    const curriculaList = fullJsonData.curricula || fullJsonData.departments || [];
    curriculaList.forEach(dept => {
        (dept.semesters || []).forEach(sem => {
            (sem.courses || []).forEach(course => {
                const code = course.code || course.course_code;
                const credit = course.credits || course.credit;
                if (code) {
                    creditLookup[code.replace(/\s/g, '')] = credit;
                }
            });
        });
    });

    let officialDenom = 0;
    const studentCodes = new Set(subjects.map(c => c.subCode.replace(/\s/g, '')));

    if (fullJsonData.departments || fullJsonData.curricula) {
        const deptList = fullJsonData.departments || fullJsonData.curricula;
        const semNum = parseInt(semester.replace('S', ''), 10);

        for (const deptData of deptList) {
            const semData = deptData.semesters?.find(s => s.semester === semNum);
            if (!semData) continue;
            const deptCodes = (semData.courses || []).map(c => (c.code || c.course_code || '').replace(/\s/g, ''));
            const overlap = deptCodes.filter(dc => studentCodes.has(dc)).length;
            if (overlap > 0) {
                officialDenom = semData.total_credit;
                break;
            }
        }
    }

    if (!officialDenom) officialDenom = semesterTotals[semester] || 0;
    if (!officialDenom) officialDenom = (scheme === '2024' && semester === 'S2') ? 24 : 21;

    const failGrades = ['F', 'FE', 'I', 'ABSENT', 'WITHHELD'];
    const isPass = !subjects.some(g => failGrades.includes((g.grade || '').toUpperCase()));

    let totalWeightedPoints = 0;
    let totalCreds = 0;

    for (const sub of subjects) {
        const cleanCode = (sub.subCode || '').replace(/\s/g, '');
        const grade = (sub.grade || '').toUpperCase().replace(/\s/g, '');
        const creds = getCourseCredits(cleanCode, creditLookup);
        const gp = GRADE_POINTS[grade] || 0;

        totalWeightedPoints += creds * gp;
        if (gp > 0) totalCreds += creds;
    }

    let sgpa = officialDenom > 0
        ? parseFloat((totalWeightedPoints / officialDenom).toFixed(2))
        : 0.0;

    if (sgpa > 10) sgpa = 10.0;

    return { sgpa, totalCredits: totalCreds, isPass };
};

module.exports = { processedData, generateExcel, calculateManualSGPA };
