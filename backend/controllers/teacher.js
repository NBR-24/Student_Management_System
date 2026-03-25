const Batch = require('../models/Batch');
const User = require('../models/User');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const fs = require('fs');

exports.createBatch = async (req, res) => {
    const { name, scheme, branch } = req.body; // Branch can be manually sent by Admin
    try {
        // Fetch the user to get their department (if they have one)
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const existingBatch = await Batch.findOne({ name });
        if (existingBatch) {
            return res.status(400).json({ message: 'Batch with this name already exists' });
        }

        const newBatch = new Batch({
            name,
            scheme,
            branch: branch || user.department, // Use provided branch or user's department
            createdBy: req.user.userId
        });

        await newBatch.save();
        res.status(201).json(newBatch);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.updateStudent = async (req, res) => {
    const { name, admissionNo, registerId } = req.body;
    const Result = require('../models/Result');
    try {
        let student = await User.findById(req.params.studentId);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const prevRegisterId = student.registerId;
        student.name = name || student.name;
        student.admissionNo = admissionNo || student.admissionNo;
        student.registerId = registerId || student.registerId;

        await student.save();

        // If registerId was set or changed, sync pre-existing results
        const newRegId = student.registerId;
        if (newRegId && newRegId !== prevRegisterId) {
            const regIdRegex = new RegExp(`^\\s*${newRegId.trim()}\\s*$`, 'i');
            await Result.updateMany(
                { registerId: { $regex: regIdRegex }, student: { $exists: false } },
                { $set: { student: student._id, batch: student.batch } }
            );
        }

        res.json({ message: 'Student updated', student });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.deleteStudent = async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const student = await User.findById(studentId);

        if (!student) return res.status(404).json({ message: 'Student not found' });

        // Remove student from their batch's student list
        if (student.batch) {
            await Batch.findByIdAndUpdate(student.batch, { $pull: { students: studentId } });
        }

        // Delete the student user account
        await User.deleteOne({ _id: studentId });

        res.json({ message: 'Student deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getBatches = async (req, res) => {
    try {
        let query = { createdBy: req.user.userId };

        // Admin and Exam Controller see all batches
        if (['admin', 'exam_controller', 'principal'].includes(req.user.role)) {
            query = {};
        } else if (req.user.role === 'hod') {
            // HOD sees only their department's batches
            const user = await User.findById(req.user.userId);
            if (user && user.department) {
                query = { branch: new RegExp(`^${user.department}$`, 'i') };
            } else {
                query = { _id: null }; // No department assigned, block access
            }
        }

        const batches = await Batch.find(query);
        res.json(batches);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.uploadStudents = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const batchId = req.params.batchId;
    const Result = require('../models/Result');

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const students = [];
        const errors = [];

        for (const row of sheetData) {
            const admissionNo = row['Admission No'] || row['admission no'] || row['AdmissionNo'];
            const registerId = row['Registerid'] || row['registerid'] || row['RegisterId'];
            const name = row['Full Name'] || row['Name'] || row['name'];

            if (!admissionNo || !registerId || !name) {
                errors.push(`Missing data for row: ${JSON.stringify(row)}`);
                continue;
            }

            // Find or create student
            let student = await User.findOne({ admissionNo });
            if (student) {
                // Ensure batch and registerId are set
                if (!student.batch || student.batch.toString() !== batchId) {
                    student.batch = batchId;
                }
                if (!student.registerId) student.registerId = String(registerId);
                await student.save();
                students.push(student._id);
            } else {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(String(registerId), salt);

                student = new User({
                    name,
                    role: 'student',
                    admissionNo,
                    registerId: String(registerId),
                    password: hashedPassword,
                    batch: batchId
                });

                await student.save();
                students.push(student._id);
            }

            // Sync: Link any pre-existing Result documents for this registerId
            // This handles university results uploaded before student credentials were created
            const cleanRegId = String(registerId).trim();
            const regIdRegex = new RegExp(`^\\s*${cleanRegId}\\s*$`, 'i');
            await Result.updateMany(
                {
                    registerId: { $regex: regIdRegex },
                    student: { $exists: false }   // Not yet linked to a student account
                },
                {
                    $set: {
                        student: student._id,
                        batch: batchId
                    }
                }
            );
        }

        // Update batch with students
        await Batch.findByIdAndUpdate(batchId, { $addToSet: { students: { $each: students } } });

        // Cleanup file
        fs.unlinkSync(req.file.path);

        if (students.length === 0) {
            return res.status(400).json({
                message: 'No valid students found. Check Excel headers.',
                errors: errors.slice(0, 5)
            });
        }

        res.json({ message: 'Students processed & results synced', count: students.length, errors });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getBatchDetails = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.batchId).populate('students', '-password');
        if (!batch) return res.status(404).json({ message: 'Batch not found' });
        res.json(batch);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.downloadInternalTemplate = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { subject } = req.query;
        if (!subject) return res.status(400).json({ message: 'Subject query parameter is required' });

        const batch = await Batch.findById(batchId).populate('students', 'name registerId admissionNo');
        if (!batch) return res.status(404).json({ message: 'Batch not found' });

        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Internal Marks');

        const is2024 = batch.scheme === '2024';

        // Setup Headers based on scheme
        if (is2024) {
            // 2024 scheme: Attendance(5) + Series1(40) + Series2(40) + Assignment(15) = 40 total
            worksheet.columns = [
                { header: 'Roll No', key: 'roll', width: 15 },
                { header: 'Name', key: 'name', width: 25 },
                { header: 'Attendance Percentage', key: 'att', width: 22 },
                { header: 'Series 1 (40)', key: 's1', width: 14 },
                { header: 'Series 2 (40)', key: 's2', width: 14 },
                { header: 'Assignment (15)', key: 'a1', width: 18 },
                { header: 'Attendance (5)', key: 'calcAtt', width: 16 },
                { header: 'Series (20)', key: 'calcSeries', width: 13 },
                { header: 'Assignments (15)', key: 'calcAssign', width: 18 },
                { header: 'Total (40)', key: 'calcTotal', width: 12 }
            ];
        } else {
            // 2019 scheme: Attendance(10) + Tests(25) + Assignments(15) = 50 total
            worksheet.columns = [
                { header: 'Roll No', key: 'roll', width: 15 },
                { header: 'Name', key: 'name', width: 25 },
                { header: 'Attendance Percentage', key: 'att', width: 22 },
                { header: 'Test1 (50)', key: 't1', width: 12 },
                { header: 'Test2 (50)', key: 't2', width: 12 },
                { header: 'Assignment 1 (15)', key: 'a1', width: 18 },
                { header: 'Assignment 2 (15)', key: 'a2', width: 18 },
                { header: 'Attendance (10)', key: 'calcAtt', width: 16 },
                { header: 'Tests (25)', key: 'calcTests', width: 12 },
                { header: 'Assignments (15)', key: 'calcAssign', width: 18 },
                { header: 'Total (50)', key: 'calcTotal', width: 12 }
            ];
        }

        // Style headers
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE8F3FD' }
        };

        // Sort students logically by registerId or rollNo
        const sortedStudents = batch.students.sort((a, b) => (a.registerId || '').localeCompare(b.registerId || ''));

        sortedStudents.forEach((student, index) => {
            const rowIdx = index + 2;
            if (is2024) {
                // 2024 scheme columns: A=Roll, B=Name, C=Att%, D=Series1, E=Series2, F=Assignment
                // Calculated: G=Att(5), H=Series(20), I=Assign(15), J=Total(40)
                worksheet.addRow({
                    roll: student.registerId || student.admissionNo,
                    name: student.name,
                    calcAtt: { formula: `IF(ISBLANK(C${rowIdx}), "", ROUND((C${rowIdx}/100)*5, 1))` },
                    calcSeries: { formula: `IF(AND(ISBLANK(D${rowIdx}), ISBLANK(E${rowIdx})), "", ROUND((SUM(D${rowIdx},E${rowIdx}))/80*20, 1))` },
                    calcAssign: { formula: `IF(ISBLANK(F${rowIdx}), "", ROUND(F${rowIdx}, 1))` },
                    calcTotal: { formula: `IF(AND(ISBLANK(G${rowIdx}), ISBLANK(H${rowIdx}), ISBLANK(I${rowIdx})), "", ROUND(SUM(G${rowIdx},H${rowIdx},I${rowIdx}), 0))` }
                });
                worksheet.getCell(`G${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                worksheet.getCell(`H${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                worksheet.getCell(`I${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                worksheet.getCell(`J${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4E6F1' } };
                worksheet.getCell(`J${rowIdx}`).font = { bold: true };
            } else {
                // 2019 scheme columns: A=Roll, B=Name, C=Att%, D=Test1, E=Test2, F=Assign1, G=Assign2
                // Calculated: H=Att(10), I=Tests(25), J=Assign(15), K=Total(50)
                worksheet.addRow({
                    roll: student.registerId || student.admissionNo,
                    name: student.name,
                    calcAtt: { formula: `IF(ISBLANK(C${rowIdx}), "", ROUND((C${rowIdx}/100)*10, 1))` },
                    calcTests: { formula: `IF(AND(ISBLANK(D${rowIdx}), ISBLANK(E${rowIdx})), "", ROUND((SUM(D${rowIdx},E${rowIdx}))/100*25, 1))` },
                    calcAssign: { formula: `IF(AND(ISBLANK(F${rowIdx}), ISBLANK(G${rowIdx})), "", ROUND(AVERAGE(F${rowIdx},G${rowIdx}), 1))` },
                    calcTotal: { formula: `IF(AND(ISBLANK(H${rowIdx}), ISBLANK(I${rowIdx}), ISBLANK(J${rowIdx})), "", ROUND(SUM(H${rowIdx},I${rowIdx},J${rowIdx}), 0))` }
                });
                worksheet.getCell(`H${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                worksheet.getCell(`I${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                worksheet.getCell(`J${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                worksheet.getCell(`K${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4E6F1' } };
                worksheet.getCell(`K${rowIdx}`).font = { bold: true };
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();

        res.setHeader('Content-Disposition', `attachment; filename="Internal_Template.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.uploadInternalmarks = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { batchId } = req.params;
    const { subject } = req.body;

    if (!subject) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Subject is required in body form-data' });
    }

    const InternalResult = require('../models/InternalResult');

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const batch = await Batch.findById(batchId).populate('students');
        if (!batch) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'Batch not found' });
        }

        let updatedCount = 0;
        const is2024 = batch.scheme === '2024';

        for (const row of sheetData) {
            const rollNo = row['Roll No'];
            if (!rollNo) continue;

            const student = batch.students.find(s => s.registerId === String(rollNo) || s.admissionNo === String(rollNo));
            if (!student) continue;

            const attPerc = parseFloat(row['Attendance Percentage']) || 0;
            let updateData = { attendancePercentage: attPerc, publishedBy: req.user.userId, scheme: batch.scheme };

            if (is2024) {
                // 2024 scheme: Attendance(5) + Series(20) + Assignment(15) = 40 total
                const s1 = parseFloat(row['Series 1 (40)']) || 0;
                const s2 = parseFloat(row['Series 2 (40)']) || 0;
                const assignment = parseFloat(row['Assignment (15)']) || 0;

                const internalAttendance = parseFloat(((attPerc / 100) * 5).toFixed(1));
                const internalSeries = parseFloat(((s1 + s2) / 80 * 20).toFixed(1));
                const internalAssignments = parseFloat(assignment.toFixed(1));
                const total = Math.round(internalAttendance + internalSeries + internalAssignments);

                Object.assign(updateData, {
                    series1: s1,
                    series2: s2,
                    // assignment1 is reused to store the single assignment mark for 2024 scheme
                    assignment1: assignment,
                    internalAttendance,
                    internalSeries,
                    internalAssignments,
                    total
                });
            } else {
                // 2019 scheme: Attendance(10) + Tests(25) + Assignments(15) = 50 total
                const t1 = parseFloat(row['Test1 (50)']) || 0;
                const t2 = parseFloat(row['Test2 (50)']) || 0;
                let a1 = row['Assignment 1 (15)'];
                let a2 = row['Assignment 2 (15)'];

                // Allow backward compatibility with old template
                if (a1 === undefined) a1 = row['Assignment 1'];
                if (a2 === undefined) a2 = row['Assignment 2'];

                const internalAttendance = parseFloat(((attPerc / 100) * 10).toFixed(1));
                const internalTests = parseFloat(((t1 + t2) / 100 * 25).toFixed(1));

                // Assignment averaging
                let sumAssignments = 0;
                let numAssignments = 0;
                let parsedA1 = 0;
                let parsedA2 = 0;
                if (a1 !== undefined && a1 !== '') {
                    parsedA1 = parseFloat(a1) || 0;
                    sumAssignments += parsedA1;
                    numAssignments++;
                }
                if (a2 !== undefined && a2 !== '') {
                    parsedA2 = parseFloat(a2) || 0;
                    sumAssignments += parsedA2;
                    numAssignments++;
                }
                const internalAssignments = parseFloat((numAssignments > 0 ? sumAssignments / numAssignments : 0).toFixed(1));
                const total = Math.round(internalAttendance + internalTests + internalAssignments);

                Object.assign(updateData, {
                    test1: t1,
                    test2: t2,
                    assignment1: parsedA1,
                    assignment2: parsedA2,
                    internalAttendance,
                    internalTests,
                    internalAssignments,
                    total
                });
            }

            // Upsert
            await InternalResult.findOneAndUpdate(
                { student: student._id, batch: batchId, subject: subject },
                updateData,
                { upsert: true, new: true }
            );
            updatedCount++;
        }

        fs.unlinkSync(req.file.path);
        res.json({ message: 'Internal results processed successfully', count: updatedCount });

    } catch (err) {
        console.error(err);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Server Error' });
    }
};
