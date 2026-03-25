const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacher');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ensure 'uploads' directory exists
        const fs = require('fs');
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });

router.post('/batch', auth('teacher'), teacherController.createBatch);
router.get('/batch', auth(['teacher', 'admin', 'exam_controller', 'hod']), teacherController.getBatches);
router.get('/batch/:batchId', auth(['teacher', 'admin', 'exam_controller', 'hod']), teacherController.getBatchDetails);
router.post('/batch/:batchId/upload', auth(['teacher', 'admin']), upload.single('file'), teacherController.uploadStudents);

// Internal Marks routes
router.get('/internal/template/:batchId', auth('teacher'), teacherController.downloadInternalTemplate);
router.post('/internal/upload/:batchId', auth('teacher'), upload.single('file'), teacherController.uploadInternalmarks);
router.put('/student/:studentId', auth('teacher'), teacherController.updateStudent);
router.delete('/student/:studentId', auth('teacher'), teacherController.deleteStudent);

module.exports = router;
