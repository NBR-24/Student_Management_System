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

        let { batchId, batchIds, examType, semester } = req.body; // Added examType, semester

        // Handle batchIds (JSON string or array)
        let targetBatchIds = [];
        if (batchIds) {
            try {
                targetBatchIds = typeof batchIds === 'string' ? JSON.parse(batchIds) : batchIds;
            } catch (e) {
                targetBatchIds = [];
            }
        } else if (batchId) {
            targetBatchIds = [batchId];
        }

        // 1. Parse PDF using new logic
        const { rawStudents, metadata } = await processedData(req.file.buffer);
        console.log(`Parsed ${rawStudents.length} students from PDF.`);

        // 2. Generate Excel Buffer (Advanced)
        // Pass the full object including metadata
        const excelBuffer = await generateExcel({ rawStudents, metadata });

        // 3. Save to Database (Bulk)
        const bulkOperations = [];

        for (const studentData of rawStudents) {
            // Find student by Register ID
            const student = await User.findOne({ registerId: studentData.registerId });

            // Prepare Result Document
            const resultPayload = {
                registerId: studentData.registerId,
                type: examType || 'university', // Use provided examType or default
                title: `${semester || metadata.semester} Result`, // Use provided semester or detected
                subjects: Object.entries(studentData.grades).map(([code, grade]) => ({
                    subCode: code,
                    name: code,
                    grade: grade
                })),
                sgpa: studentData.sgpa,
                totalCredits: studentData.totalCredits,
                published: false, // Default to Draft mode
                date: new Date()
            };

            let finalBatchId = null;

            // Logic to determine Batch ID
            if (student && student.batch) {
                // If student has a batch, use it.
                finalBatchId = student.batch;
                resultPayload.student = student._id;
            } else if (student) {
                // Student exists but has no batch in their profile.
                // Try to find them in the selected batches (Reverse Lookup)
                const foundBatch = await Batch.findOne({
                    _id: { $in: targetBatchIds },
                    students: student._id
                });

                if (foundBatch) {
                    finalBatchId = foundBatch._id;
                    resultPayload.student = student._id;
                    // Self-heal: Update student profile
                    await User.findByIdAndUpdate(student._id, { batch: foundBatch._id });
                } else if (targetBatchIds.length === 1) {
                    // If only one batch was selected, assume they belong to it (Legacy fallback)
                    finalBatchId = targetBatchIds[0];
                    resultPayload.student = student._id;
                    // We could also update the student here? Yes, safer.
                    await User.findByIdAndUpdate(student._id, { batch: finalBatchId });
                }
            } else {
                // Student not found in DB at all.
                // We can't link them.Result will be orphaned.
            }

            if (finalBatchId) {
                resultPayload.batch = finalBatchId;

                // Upsert: Join on registerId + type + title
                bulkOperations.push({
                    updateOne: {
                        filter: {
                            registerId: studentData.registerId,
                            type: resultPayload.type,
                            title: resultPayload.title
                        },
                        update: { $set: resultPayload },
                        upsert: true
                    }
                });
            }
        } // End of For Loop

        console.log(`Prepared ${bulkOperations.length} bulk operations.`);

        // Execute Bulk Write
        if (bulkOperations.length > 0) {
            const bulkResult = await Result.bulkWrite(bulkOperations);
            console.log(`Bulk Write Result: Matched ${bulkResult.matchedCount}, Modified ${bulkResult.modifiedCount}, Upserted ${bulkResult.upsertedCount}`);
        } else {
            console.log("No bulk operations to execute (possibly due to missing student/batch mapping).");
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

exports.publishResult = async (req, res) => {
    try {
        const { batchId, title, type } = req.body;

        if (!batchId || !title) {
            return res.status(400).json({ message: "Batch ID and Title are required" });
        }

        const result = await Result.updateMany(
            {
                batch: batchId,
                title: title,
                type: type || 'university'
            },
            { $set: { published: true } }
        );

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
            .sort({ 'student.registerId': 1 }); // Sort by Register ID associated with student if possible

        res.json(results);

    } catch (err) {
        console.error("Error fetching result details:", err);
        res.status(500).send('Server Error');
    }
};

exports.deleteResult = async (req, res) => {
    try {
        const { batchId, title, type } = req.body;

        if (!batchId || !title) return res.status(400).json({ message: "Missing parameters" });

        const result = await Result.deleteMany({
            batch: batchId,
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

        const query = {
            title: title,
            type: type || 'university'
        };

        const results = await Result.find(query).populate('student', 'name admissionNo registerId');

        if (!results.length) return res.json(null);

        // 1. Top 10 Performers (Across College)
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
        console.error("Error generating college analysis:", err);
        res.status(500).send("Server Error");
    }
};

exports.getDepartmentResultAnalysis = async (req, res) => {
    try {
        const { title, type } = req.query;
        // 1. Get Teacher's Department
        const user = await User.findById(req.user.userId);
        if (!user || user.role !== 'teacher' || !user.department) {
            return res.status(400).json({ message: "User is not a teacher or has no department assigned." });
        }

        const department = user.department;
        console.log(`[DEBUG] Teacher ID: ${req.user.userId}, Department: "${department}"`);

        // 2. Find all batches for this department
        const Batch = require('../models/Batch'); // Ensure Batch model is imported
        const departmentBatches = await Batch.find({ branch: department }).select('_id name branch');
        console.log(`[DEBUG] Found ${departmentBatches.length} batches for department "${department}":`, departmentBatches.map(b => `${b.name} (${b.branch})`));

        const batchIds = departmentBatches.map(b => b._id);

        if (!batchIds.length) return res.json(null);

        // 3. Aggregate Results
        const query = {
            batch: { $in: batchIds },
            title: title,
            type: type || 'university'
        };

        const results = await Result.find(query)
            .populate('student', 'name admissionNo registerId batch')
            .populate('batch', 'name'); // Populate batch to show which batch the student belongs to

        if (!results.length) return res.json(null);

        // --- Analysis Logic (Same as College/Batch) ---

        // 1. Top 10 Performers
        const topPerformers = [...results]
            .sort((a, b) => b.sgpa - a.sgpa)
            .slice(0, 10)
            .map(r => ({
                name: `${r.student?.name || r.registerId} (${r.batch?.name || 'Unknown'})`,
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
            department,
            topPerformers,
            passFail: [
                { name: 'Passed', value: passed },
                { name: 'Failed', value: failed }
            ],
            subjectAnalysis: Object.values(subjectStats)
        });

    } catch (err) {
        console.error("Error generating department analysis:", err);
        res.status(500).send("Server Error");
    }
};