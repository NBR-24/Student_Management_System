const Result = require('../models/Result');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const Batch = require('../models/Batch'); // Added
const { processedData, generateExcel } = require('../utils/resultProcessor');

// --- Results ---
exports.addResult = async (req, res) => {
    try {
        const { studentId, batchId, type, title, subjects } = req.body;

        const result = new Result({
            student: studentId,
            batch: batchId,
            type,
            title,
            subjects,
            publishedBy: req.user.userId
        });

        await result.save();
        res.status(201).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getResultsByStudent = async (req, res) => {
    try {
        // Find results linked to this student OR matching their registerId
        const student = await User.findById(req.user.userId);

        let query = { student: req.user.userId };
        if (student && student.registerId) {
            // Case-insensitive regex for registerId, ignoring surrounding whitespace
            const cleanRegId = student.registerId.trim();
            const regIdRegex = new RegExp(`^\\s*${cleanRegId}\\s*$`, 'i');
            query = {
                $or: [
                    { student: req.user.userId },
                    { registerId: { $regex: regIdRegex } }
                ],
                published: true // Only show published results
            };
        } else {
            query.published = true;
        }

        const results = await Result.find(query).sort({ date: -1 });

        // Debug Information (Temporary)
        if (results.length === 0) {
            console.log(`No results found for User: ${req.user.userId}, RegID: ${student?.registerId}`);
            // We can Return metadata to help frontend debug if needed, but for now just adhere to JSON array contract
        }

        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getResultsByBatch = async (req, res) => {
    try {
        // Teacher views results for a specific batch (optional filter)
        const { batchId } = req.query;
        let query = {};
        if (batchId) query.batch = batchId;

        const results = await Result.find(query)
            .populate('student', 'name admissionNo')
            .populate('batch', 'name');
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- Assignments ---
exports.createAssignment = async (req, res) => {
    try {
        const { title, description, batchId, dueDate } = req.body;

        const assignment = new Assignment({
            title,
            description,
            batch: batchId,
            dueDate,
            createdBy: req.user.userId
        });

        await assignment.save();
        res.status(201).json(assignment);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getAssignments = async (req, res) => {
    try {
        // Teachers see what they created, Students see what's for their batch
        // Simplified: Teachers see all for now (or filtered by their batches)
        // Students: Need to find their batch first.

        let query = {};
        if (req.user.role === 'teacher') {
            query.createdBy = req.user.userId;
        } else if (req.user.role === 'student') {
            // Find student's batch
            const student = await User.findById(req.user.userId);
            if (student && student.batch) {
                query.batch = student.batch;
            } else {
                return res.json([]); // No batch assigned
            }
        }

        const assignments = await Assignment.find(query).populate('batch', 'name branch');
        res.json(assignments);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- PDF Upload for Results ---
const uploadResultPDF = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const { examType, semester } = req.body;

        // 1. Parse PDF
        const { rawStudents, metadata } = await processedData(req.file.buffer);
        console.log(`Parsed ${rawStudents.length} students from PDF.`);

        // 2. Generate Excel
        const excelBuffer = await generateExcel({ rawStudents, metadata });

        // 3. Save ALL students to DB, keyed ONLY on registerId ─ no batch/account required
        const bulkOperations = [];

        for (const studentData of rawStudents) {
            // Try to find an existing User account by registerId (optional link, never a blocker)
            const student = await User.findOne({
                registerId: { $regex: new RegExp(`^\\s*${studentData.registerId.trim()}\\s*$`, 'i') }
            });

            const resultPayload = {
                registerId: studentData.registerId.trim(),
                type: examType || 'university',
                title: metadata.examTitle || `${semester || metadata.semester} Result`,
                subjects: Object.entries(studentData.grades).map(([code, grade]) => ({
                    subCode: code,
                    name: code,
                    grade
                })),
                sgpa: studentData.sgpa,
                totalCredits: studentData.totalCredits,
                published: false,
                date: new Date()
            };

            // Link student account + batch if they already exist (bonus, not required)
            if (student) {
                resultPayload.student = student._id;
                if (student.batch) resultPayload.batch = student.batch;
            }

            // Always upsert — keyed on registerId + title + type
            bulkOperations.push({
                updateOne: {
                    filter: {
                        registerId: resultPayload.registerId,
                        type: resultPayload.type,
                        title: resultPayload.title
                    },
                    update: { $set: resultPayload },
                    upsert: true
                }
            });
        }

        if (bulkOperations.length > 0) {
            const bulkResult = await Result.bulkWrite(bulkOperations);
            console.log(`Saved ${bulkOperations.length} results. Upserted: ${bulkResult.upsertedCount}, Modified: ${bulkResult.modifiedCount}`);
        }

        // 4. Return Excel file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=university_results.xlsx');
        res.send(excelBuffer);

    } catch (error) {
        console.error(error);
        const fs = require('fs');
        const path = require('path');
        fs.appendFileSync(path.join(__dirname, '../debug_error.log'), `${new Date().toISOString()} - Upload Error: ${error.message}\n${error.stack}\n\n`);
        res.status(500).json({ message: 'Error processing PDF', error: error.message });
    }
};

exports.uploadResultPDF = uploadResultPDF;

// --- Result Publishing Operations ---



exports.downloadBatchResult = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { title, type } = req.query;

        // Fetch Results
        const results = await Result.find({
            batch: batchId,
            title: title,
            type: type || 'university'
        }).populate('student', 'name registerId');

        if (results.length === 0) {
            return res.status(404).send('No results found for this batch and title.');
        }

        // Transform to "rawStudents" format expected by generateExcel
        // rawStudents object: { registerId, name, sgpa, totalCredits, grades: { subCode: grade } }
        const rawStudents = results.map(r => {
            const grades = {};
            r.subjects.forEach(sub => {
                grades[sub.subCode] = sub.grade;
            });
            return {
                registerId: r.registerId || r.student?.registerId,
                name: r.student?.name,
                sgpa: r.sgpa,
                totalCredits: r.totalCredits,
                grades: grades // This format is slightly different from processedData output but generateExcel should adapt or we match it.
            };
        });

        // Mock Metadata (since we don't store it all, but we have title)
        const metadata = {
            college: "Musaliar College of Engineering & Technology", // Hardcoded or from DB
            semester: title,
            batch: results[0].batch // ID
        };

        const excelBuffer = await generateExcel({ rawStudents, metadata });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=results.xlsx');
        res.send(excelBuffer);

    } catch (err) {
        console.error("Error downloading excel:", err);
        res.status(500).send('Server Error');
    }
};

// Download Excel for all students across all batches for a given exam title (for EC)
exports.downloadResultExcelGlobal = async (req, res) => {
    try {
        const { title, type } = req.query;

        const results = await Result.find({
            title: title,
            type: type || 'university'
        }).populate('student', 'name registerId').sort({ registerId: 1 });

        if (results.length === 0) {
            return res.status(404).send('No results found for this exam.');
        }

        const rawStudents = results.map(r => {
            const grades = {};
            r.subjects.forEach(sub => { grades[sub.subCode] = sub.grade; });
            return {
                registerId: r.registerId || r.student?.registerId,
                name: r.student?.name,
                sgpa: r.sgpa,
                totalCredits: r.totalCredits,
                grades
            };
        });

        const metadata = {
            college: "Musaliar College of Engineering & Technology",
            semester: title,
            batch: null
        };

        const excelBuffer = await generateExcel({ rawStudents, metadata });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${title}.xlsx"`);
        res.send(excelBuffer);

    } catch (err) {
        console.error("Error downloading global excel:", err);
        res.status(500).send('Server Error');
    }
};

exports.getBatchResultOverview = async (req, res) => {
    try {
        const { batchId } = req.params;
        const mongoose = require('mongoose');

        // Aggregate to get unique exams uploaded for this batch
        const overview = await Result.aggregate([
            { $match: { batch: new mongoose.Types.ObjectId(batchId) } },
            {
                $group: {
                    _id: { title: "$title", type: "$type" },
                    totalStudents: { $sum: 1 },
                    published: { $first: "$published" },
                    lastUploaded: { $max: "$date" },
                    averageSGPA: { $avg: "$sgpa" }
                }
            },
            { $sort: { lastUploaded: -1 } }
        ]);

        res.json(overview.map(item => ({
            title: item._id.title,
            type: item._id.type,
            totalStudents: item.totalStudents,
            published: item.published,
            lastUploaded: item.lastUploaded,
            averageSGPA: (item.averageSGPA || 0).toFixed(2)
        })));

    } catch (err) {
        console.error("Error fetching result overview:", err);
        res.status(500).send('Server Error');
    }
};

// Get overview of ALL published results across all batches (for Exam Controller)
exports.getAllResultOverview = async (req, res) => {
    try {
        const overview = await Result.aggregate([
            { $match: { published: true } },
            {
                $group: {
                    _id: { title: "$title", type: "$type" },
                    totalStudents: { $sum: 1 },
                    lastUploaded: { $max: "$date" },
                    averageSGPA: { $avg: "$sgpa" }
                }
            },
            { $sort: { lastUploaded: -1 } }
        ]);

        res.json(overview.map(item => ({
            title: item._id.title,
            type: item._id.type,
            totalStudents: item.totalStudents,
            published: true,
            lastUploaded: item.lastUploaded,
            averageSGPA: (item.averageSGPA || 0).toFixed(2)
        })));

    } catch (err) {
        console.error("Error fetching all results overview:", err);
        res.status(500).send('Server Error');
    }
};

// Get overview of ALL DRAFT (unpublished) results across all batches (for Exam Controller Recent Uploads)
exports.getDraftResultOverview = async (req, res) => {
    try {
        const overview = await Result.aggregate([
            { $match: { published: false } },
            {
                $group: {
                    _id: { title: "$title", type: "$type" },
                    totalStudents: { $sum: 1 },
                    lastUploaded: { $max: "$date" },
                    averageSGPA: { $avg: "$sgpa" }
                }
            },
            { $sort: { lastUploaded: -1 } }
        ]);

        res.json(overview.map(item => ({
            title: item._id.title,
            type: item._id.type,
            totalStudents: item.totalStudents,
            published: false,
            lastUploaded: item.lastUploaded,
            averageSGPA: (item.averageSGPA || 0).toFixed(2)
        })));

    } catch (err) {
        console.error("Error fetching draft results overview:", err);
        res.status(500).send('Server Error');
    }
};

exports.publishResult = async (req, res) => {
    try {
        const { batchId, title, type } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Title is required" });
        }

        // If batchId provided, publish only for that batch (teacher action)
        // If no batchId, publish across all batches (exam controller action)
        const filter = { title, type: type || 'university' };
        if (batchId) filter.batch = batchId;

        const result = await Result.updateMany(filter, { $set: { published: true } });

        res.json({ message: "Result published successfully", modified: result.modifiedCount });

    } catch (err) {
        console.error("Error publishing result:", err);
        res.status(500).send('Server Error');
    }
};

exports.getBatchResultDetails = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { title, type } = req.query;

        if (!title) {
            return res.status(400).json({ message: "Title is required" });
        }

        const results = await Result.find({
            batch: batchId,
            title: title,
            type: type || 'university'
        })
            .populate('student', 'name admissionNo registerId')
            .sort({ registerId: 1 });

        res.json(results);

    } catch (err) {
        console.error("Error fetching result details:", err);
        res.status(500).send('Server Error');
    }
};

// Get all student details for an exam across ALL batches (for EC dashboard modal)
exports.getAllResultDetails = async (req, res) => {
    try {
        const { title, type } = req.query;

        if (!title) {
            return res.status(400).json({ message: "Title is required" });
        }

        const results = await Result.find({
            title: title,
            type: type || 'university',
            published: true
        })
            .populate('student', 'name admissionNo registerId')
            .populate('batch', 'name branch')
            .sort({ registerId: 1 });

        res.json(results);

    } catch (err) {
        console.error("Error fetching all result details:", err);
        res.status(500).send('Server Error');
    }
};

exports.deleteResult = async (req, res) => {
    try {
        const { title, type } = req.body;

        if (!title) return res.status(400).json({ message: "Missing title parameter" });

        // Delete across all batches by title+type
        const result = await Result.deleteMany({
            title: title,
            type: type || 'university'
        });

        res.json({ message: "Result set deleted", deletedCount: result.deletedCount });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

exports.getBatchResultAnalysis = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { title, type } = req.query;

        if (!title) return res.status(400).json({ message: "Title is required" });

        const query = {
            batch: batchId,
            title: title,
            type: type || 'university'
        };

        const results = await Result.find(query).populate('student', 'name admissionNo registerId');

        if (!results.length) return res.json(null);

        // 1. Top 10 Performers
        const topPerformers = [...results]
            .sort((a, b) => b.sgpa - a.sgpa)
            .slice(0, 10)
            .map(r => ({
                name: r.student?.name || r.registerId,
                sgpa: r.sgpa
            }));

        // 2. Pass/Fail Analysis
        let passed = 0;
        let failed = 0;
        const failedGrades = ['F', 'FE', 'I', 'Absent'];

        // 3. Subject-wise Analysis
        const subjectStats = {};

        results.forEach(r => {
            let isStudentFailed = false;
            r.subjects.forEach(sub => {
                if (!subjectStats[sub.subCode]) {
                    subjectStats[sub.subCode] = { code: sub.subCode, pass: 0, fail: 0 };
                }

                if (failedGrades.includes(sub.grade)) {
                    subjectStats[sub.subCode].fail++;
                    isStudentFailed = true;
                } else {
                    subjectStats[sub.subCode].pass++;
                }
            });

            if (isStudentFailed) failed++;
            else passed++;
        });

        res.json({
            topPerformers,
            passFail: [
                { name: 'Passed', value: passed },
                { name: 'Failed', value: failed }
            ],
            subjectAnalysis: Object.values(subjectStats)
        });

    } catch (err) {
        console.error("Error generating analysis:", err);
        res.status(500).send("Server Error");
    }
};

exports.getCollegeResultAnalysis = async (req, res) => {
    try {
        const { title, type } = req.query;

        if (!title) return res.status(400).json({ message: "Title is required" });

        // Query ALL results for this exam — no batch filter, truly college-wide
        const results = await Result.find({
            title,
            type: type || 'university'
        }).populate('student', 'name admissionNo registerId');

        if (!results.length) return res.json(null);

        // 1. Top 10 Performers (Across Entire College)
        const topPerformers = [...results]
            .filter(r => r.sgpa > 0)
            .sort((a, b) => b.sgpa - a.sgpa)
            .slice(0, 10)
            .map(r => ({
                name: r.student?.name || r.registerId,
                sgpa: r.sgpa
            }));

        // 2. Pass/Fail + Subject-wise Analysis
        const failedGrades = ['F', 'FE', 'I', 'ABSENT', 'Absent'];
        let passed = 0, failed = 0;
        const subjectStats = {};

        // 3. Per-department breakdown (inferred from registerId: PKD24CE001 → CE)
        const deptStats = {};

        results.forEach(r => {
            let isStudentFailed = false;

            r.subjects.forEach(sub => {
                if (!subjectStats[sub.subCode]) {
                    subjectStats[sub.subCode] = { code: sub.subCode, pass: 0, fail: 0 };
                }
                if (failedGrades.includes(sub.grade)) {
                    subjectStats[sub.subCode].fail++;
                    isStudentFailed = true;
                } else {
                    subjectStats[sub.subCode].pass++;
                }
            });

            if (isStudentFailed) failed++;
            else passed++;

            // Extract dept code from registerId (e.g. PKD24CE001 → CE)
            const regId = r.registerId || '';
            const deptCode = regId.length >= 7 ? regId.substring(5, 7) : 'XX';
            if (!deptStats[deptCode]) deptStats[deptCode] = { dept: deptCode, pass: 0, fail: 0, total: 0 };
            deptStats[deptCode].total++;
            if (isStudentFailed) deptStats[deptCode].fail++;
            else deptStats[deptCode].pass++;
        });

        res.json({
            totalStudents: results.length,
            topPerformers,
            passFail: [
                { name: 'Passed', value: passed },
                { name: 'Failed', value: failed }
            ],
            subjectAnalysis: Object.values(subjectStats),
            deptBreakdown: Object.values(deptStats).sort((a, b) => a.dept.localeCompare(b.dept))
        });

    } catch (err) {
        console.error("Error generating college analysis:", err);
        res.status(500).send("Server Error");
    }
};


exports.getDepartmentResultAnalysis = async (req, res) => {
    try {
        const { title, type } = req.query;
        const user = await User.findById(req.user.userId);

        let department = null;
        let batchIds = [];

        if (user && user.department) {
            department = user.department.trim(); // e.g. "IT", "CS", "CE"
        }

        if (department) {
            const departmentBatches = await Batch.find({ branch: new RegExp(`^${department}$`, 'i') }).select('_id');
            batchIds = departmentBatches.map(b => b._id);
            console.log(`[Dept Analysis] Dept: ${department}, Batches found: ${batchIds.length}`);
        }

        if (!department) {
            return res.status(400).json({ message: 'No department assigned to this user.' });
        }

        // Dual query strategy:
        // 1. Results linked to the department's batches (for students already assigned to a batch)
        // 2. Results where registerId contains the dept code (for universally-stored results)
        //    RegId format: PKD24IT001 → dept code at positions 5-7 (2 chars)

        const baseQuery = { title, type: type || 'university' };

        const [batchResults, regIdResults] = await Promise.all([
            // Strategy 1: By batch
            batchIds.length
                ? Result.find({ ...baseQuery, batch: { $in: batchIds } }).populate('student', 'name registerId').populate('batch', 'name')
                : Promise.resolve([]),

            // Strategy 2: By registerId pattern (dept code, case-insensitive, at chars 5-6 of regId)
            Result.find({
                ...baseQuery,
                registerId: { $regex: new RegExp(`^PKD\\d{2}${department}\\d+`, 'i') }
            }).populate('student', 'name registerId').populate('batch', 'name')
        ]);

        // Merge and deduplicate by _id
        const seen = new Set();
        const results = [...batchResults, ...regIdResults].filter(r => {
            const id = r._id.toString();
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });

        console.log(`[Dept Analysis] Total results after merge: ${results.length} (batch: ${batchResults.length}, regId: ${regIdResults.length})`);

        if (!results.length) return res.json(null);

        // 1. Top 10 Performers
        const topPerformers = [...results]
            .filter(r => r.sgpa > 0)
            .sort((a, b) => b.sgpa - a.sgpa)
            .slice(0, 10)
            .map(r => ({
                name: r.student?.name || r.registerId,
                sgpa: r.sgpa
            }));

        // 2. Pass/Fail + Subject-wise Analysis
        const failedGrades = ['F', 'FE', 'I', 'ABSENT', 'Absent'];
        let passed = 0, failed = 0;
        const subjectStats = {};

        results.forEach(r => {
            let isStudentFailed = false;
            r.subjects.forEach(sub => {
                if (!subjectStats[sub.subCode]) {
                    subjectStats[sub.subCode] = { code: sub.subCode, pass: 0, fail: 0 };
                }
                if (failedGrades.includes(sub.grade)) {
                    subjectStats[sub.subCode].fail++;
                    isStudentFailed = true;
                } else {
                    subjectStats[sub.subCode].pass++;
                }
            });
            if (isStudentFailed) failed++;
            else passed++;
        });

        res.json({
            department,
            totalStudents: results.length,
            topPerformers,
            passFail: [
                { name: 'Passed', value: passed },
                { name: 'Failed', value: failed }
            ],
            subjectAnalysis: Object.values(subjectStats)
        });

    } catch (err) {
        console.error('Error generating department analysis:', err);
        res.status(500).send('Server Error');
    }
};
