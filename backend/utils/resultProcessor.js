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
        //   - LPKD20IT065  (lateral entry)
        //   - IDK19IT017   (other college)
        const regNoPattern = /([A-Z]+\d{2}[A-Z]{2,3}\d{3})/gi;

        let match;
        const studentIndices = [];
        while ((match = regNoPattern.exec(fullText)) !== null) {
            const fullRegNo = match[1].toUpperCase();
            const deptMatch = fullRegNo.match(/\d{2}([A-Z]{2,3})\d{3}/);
            const deptCode = deptMatch ? deptMatch[1] : 'XX';

            studentIndices.push({
                regNo: fullRegNo,            // exact original register number
                dept: deptCode,              // safely extracted dept code
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

    // Calculate majority year to determine regular vs supply for this exam
    const yearCounts = {};
    rawStudents.forEach(s => {
        const yearMatch = (s.registerId || '').match(/\d{2}/);
        const year = yearMatch ? yearMatch[0] : '00';
        s.admissionYear = year;
        yearCounts[year] = (yearCounts[year] || 0) + 1;
    });

    let majorityYear = null;
    let maxCount = 0;
    for (const year in yearCounts) {
        if (yearCounts[year] > maxCount) {
            maxCount = yearCounts[year];
            majorityYear = year;
        }
    }
    
    rawStudents.forEach(s => {
        s.studentType = (s.admissionYear === majorityYear) ? 'Regular' : 'Supply';
    });

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
        const lastColIndex = 6 + deptCourses.length;

        // Metadata Header
        worksheet.mergeCells(1, 1, 1, lastColIndex);
        const cellA1 = worksheet.getCell(1, 1);
        cellA1.value = `EXAMINATION: ${examName}`;
        cellA1.font = { bold: true, size: 12 };
        cellA1.alignment = { horizontal: 'center', vertical: 'middle' };
        cellA1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }; // Light Blue

        worksheet.mergeCells(2, 1, 2, lastColIndex);
        const cellA2 = worksheet.getCell(2, 1);
        cellA2.value = `SEMESTER: ${semester} | SCHEME: ${scheme}`;
        cellA2.font = { bold: true, size: 11 };
        cellA2.alignment = { horizontal: 'center', vertical: 'middle' };
        cellA2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }; // Light Blue

        worksheet.mergeCells(3, 1, 3, lastColIndex);
        const cellA3 = worksheet.getCell(3, 1);
        cellA3.value = `DEPARTMENT: ${dept}`;
        cellA3.font = { bold: true, size: 11 };
        cellA3.alignment = { horizontal: 'center', vertical: 'middle' };
        cellA3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }; // Light Blue

        // Statistics (Based ONLY on Regular Students)
        const regularStudents = studentList.filter(s => s.studentType === 'Regular');

        const totalS = regularStudents.length;
        const passS = regularStudents.filter(s => s.isPass).length;
        const failS = totalS - passS;
        const passPerc = totalS > 0 ? ((passS / totalS) * 100).toFixed(2) : 0;

        worksheet.mergeCells(5, 1, 5, lastColIndex);
        const cellA5 = worksheet.getCell(5, 1);
        cellA5.value = "OVERALL PERFORMANCE ANALYSIS (REGULAR STUDENTS)";
        cellA5.font = { bold: true, color: { argb: 'FF000000' } };
        cellA5.alignment = { horizontal: 'center', vertical: 'middle' };
        cellA5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }; // Light Yellow

        worksheet.mergeCells(6, 1, 6, lastColIndex);
        const cellA6 = worksheet.getCell(6, 1);
        cellA6.value = `Total Students: ${totalS} | Pass: ${passS} | Fail: ${failS} | Pass%: ${passPerc}%`;
        cellA6.font = { bold: true };
        cellA6.alignment = { horizontal: 'center', vertical: 'middle' };
        cellA6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };

        const regularCount = studentList.filter(s => s.studentType === 'Regular').length;
        const supplyCount = studentList.filter(s => s.studentType === 'Supply').length;
        worksheet.mergeCells(7, 1, 7, lastColIndex);
        const cellA7 = worksheet.getCell(7, 1);
        cellA7.value = `Regular Students: ${regularCount} | Supply Students: ${supplyCount}`;
        cellA7.font = { bold: true, color: { argb: 'FF0000FF' } };
        cellA7.alignment = { horizontal: 'center', vertical: 'middle' };
        cellA7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };

        worksheet.mergeCells(8, 1, 8, lastColIndex);
        const cellA8 = worksheet.getCell(8, 1);
        cellA8.value = "Note: Analysis is based on the regular students";
        cellA8.font = { italic: true, color: { argb: 'FFFF0000' } };
        cellA8.alignment = { horizontal: 'center', vertical: 'middle' };

        // Sort students: Regular first, then Supply
        studentList.sort((a, b) => {
            if (a.studentType === 'Regular' && b.studentType !== 'Regular') return -1;
            if (a.studentType !== 'Regular' && b.studentType === 'Regular') return 1;
            return a.registerId.localeCompare(b.registerId);
        });

        // Table Header — show "CODE – Course Name" if name is available
        const headerRow = [
            'Register No',
            'Student Name',
            'Student Type',
            ...deptCourses.map(c => codeToName[c] ? `${c} – ${codeToName[c]}` : c),
            'Total Credits', 'SGPA', 'Result'
        ];
        const tableStartRow = 10;
        const headerCellRow = worksheet.getRow(tableStartRow);
        headerCellRow.values = headerRow;

        // Apply column widths for readability (narrowed as per request)
        worksheet.getColumn(1).width = 16; // Register No
        worksheet.getColumn(2).width = 25; // Student Name
        worksheet.getColumn(3).width = 15; // Student Type
        
        // Course columns
        for (let i = 1; i <= deptCourses.length; i++) {
             worksheet.getColumn(3 + i).width = 12; // Adjusted for grades
        }
        worksheet.getColumn(4 + deptCourses.length).width = 15; // Total Credits
        worksheet.getColumn(5 + deptCourses.length).width = 10; // SGPA
        worksheet.getColumn(6 + deptCourses.length).width = 12; // Result

        // Style table headers: purple background, white font, and outer border
        headerCellRow.eachCell((cell, colNumber) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White text
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF800080' } // Purple background
            };
            cell.border = {
                top: { style: 'medium' },
                bottom: { style: 'thin', color: { argb: 'FFEFEFEF' } },
                left: colNumber === 1 ? { style: 'medium' } : { style: 'thin', color: { argb: 'FFEFEFEF' } },
                right: colNumber === lastColIndex ? { style: 'medium' } : { style: 'thin', color: { argb: 'FFEFEFEF' } }
            };
        });

        // Data Rows
        studentList.forEach((s, idx) => {
            const rowData = [
                s.registerId,
                s.name || '-',   // Student Name (from DB lookup if available)
                s.studentType,   // Student Type (Regular/Supply)
            ];
            deptCourses.forEach(c => {
                rowData.push(s.grades[c] || '-');
            });
            rowData.push(s.totalCredits);
            rowData.push(s.sgpa);
            rowData.push(s.isPass ? 'PASS' : 'FAIL');

            const row = worksheet.getRow(tableStartRow + 1 + idx);
            row.values = rowData;

            // Apply readable inner borders, thick outer borders, and alignment to data rows
            const isLastRow = idx === studentList.length - 1;
            row.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFEFEFEF' } },
                    bottom: isLastRow ? { style: 'medium' } : { style: 'thin', color: { argb: 'FFEFEFEF' } },
                    left: colNumber === 1 ? { style: 'medium' } : { style: 'thin', color: { argb: 'FFEFEFEF' } },
                    right: colNumber === lastColIndex ? { style: 'medium' } : { style: 'thin', color: { argb: 'FFEFEFEF' } }
                };
                
                // Keep Register No, Student Name, Student Type left-aligned, otherwise center
                if (colNumber <= 3) {
                    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                } else {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
            });

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
        worksheet.mergeCells(currentRow, 1, currentRow, 3);
        const toppersHeader = worksheet.getCell(currentRow, 1);
        toppersHeader.value = "TOP 10 PERFORMERS (REGULAR)";
        toppersHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White
        toppersHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF800080' } }; // Purple
        toppersHeader.alignment = { horizontal: 'center', vertical: 'middle' };

        currentRow++;
        worksheet.getCell(`A${currentRow}`).value = "Rank & Reg No";
        worksheet.getCell(`B${currentRow}`).value = "SGPA";
        worksheet.getCell(`C${currentRow}`).value = "Student Name";
        ['A', 'B', 'C'].forEach(col => {
            worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
            worksheet.getCell(`${col}${currentRow}`).border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
        });

        const toppers = regularStudents.filter(s => s.isPass).sort((a, b) => b.sgpa - a.sgpa).slice(0, 10);
        toppers.forEach((t, i) => {
            currentRow++;
            worksheet.getCell(`A${currentRow}`).value = `${i + 1}. ${t.registerId}`;
            worksheet.getCell(`B${currentRow}`).value = t.sgpa;
            worksheet.getCell(`C${currentRow}`).value = t.name || 'Name not found';
        });

        // --- Subject Failure Analysis ---
        currentRow += 3;
        worksheet.mergeCells(currentRow, 1, currentRow, 3);
        const failureHeader = worksheet.getCell(currentRow, 1);
        failureHeader.value = "SUBJECT-WISE FAILURE ANALYSIS (REGULAR)";
        failureHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White
        failureHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF800080' } }; // Purple
        failureHeader.alignment = { horizontal: 'center', vertical: 'middle' };

        currentRow++;
        worksheet.getCell(`A${currentRow}`).value = "Course";
        worksheet.getCell(`B${currentRow}`).value = "Failures";
        ['A', 'B'].forEach(col => {
            worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
            worksheet.getCell(`${col}${currentRow}`).border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
        });

        deptCourses.forEach((code, i) => {
            currentRow++;
            const failCount = regularStudents.filter(s => {
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
