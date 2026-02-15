const Batch = require('../models/Batch');
const User = require('../models/User');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const fs = require('fs');

exports.createBatch = async (req, res) => {
    const { name, scheme } = req.body; // Branch is auto-assigned
    try {
        // Fetch the teacher to get their department
        const teacher = await User.findById(req.user.userId);
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        const existingBatch = await Batch.findOne({ name });
        if (existingBatch) {
            return res.status(400).json({ message: 'Batch with this name already exists' });
        }

        const newBatch = new Batch({
            name,
            scheme,
            branch: teacher.department, // Auto-assign department
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
    try {
        let student = await User.findById(req.params.studentId);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        student.name = name || student.name;
        student.admissionNo = admissionNo || student.admissionNo;
        student.registerId = registerId || student.registerId;

        await student.save();
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
        const batches = await Batch.find({ createdBy: req.user.userId });
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

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const students = [];
        const errors = [];

        for (const row of sheetData) {
            // Expected columns: "Roll No", "Full Name", "Registerid", "Admission No"
            // Keys might differ based on Excel file headers, assuming exact match or similar.
            // We'll normalize keys if needed, but for now rely on user providing correct headers.
            // Keys in JSON will be: 'Roll No', 'Full Name', 'Registerid', 'Admission No' (or similar)

            const admissionNo = row['Admission No'] || row['admission no'] || row['AdmissionNo'];
            const registerId = row['Registerid'] || row['registerid'] || row['RegisterId'];
            const name = row['Full Name'] || row['Name'] || row['name'];

            if (!admissionNo || !registerId || !name) {
                errors.push(`Missing data for row: ${JSON.stringify(row)}`);
                continue;
            }

            // Check if student already exists
            let student = await User.findOne({ admissionNo });
            if (student) {
                // Option: Update existing or skip. For now, skip or update batch link.
                // If student exists, maybe we just add them to the batch?
                // But "User id for student must be Admission No". Unique constraint.
                if (!student.batch || student.batch.toString() !== batchId) {
                    // Maybe update batch?
                    // student.batch = batchId;
                    // await student.save();
                }
                students.push(student._id);
                continue;
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(String(registerId), salt);

            student = new User({
                name,
                role: 'student',
                admissionNo,
                registerId: String(registerId), // Store plain for reference? Or only hash?
                // Security: prompt says "password must be their Registerid". 
                password: hashedPassword,
                batch: batchId
            });

            await student.save();
            students.push(student._id);
        }

        // Update batch with students
        await Batch.findByIdAndUpdate(batchId, { $addToSet: { students: { $each: students } } });

        // Cleanup file
        fs.unlinkSync(req.file.path);

        if (students.length === 0) {
            return res.status(400).json({
                message: 'No valid students found. Check Excel headers.',
                errors: errors.slice(0, 5) // Send first 5 errors
            });
        }

        res.json({ message: 'Students processed', count: students.length, errors });
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
