const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academic');
const auth = require('../middleware/auth');
const multer = require('multer'); // Added for file uploads

const upload = multer(); // Added for file uploads

// Results
// Results
router.post('/result', auth('teacher'), academicController.addResult);
router.post('/result/upload', auth(['teacher', 'admin', 'exam_controller']), upload.single('file'), academicController.uploadResultPDF);
router.get('/result/student', auth('student'), academicController.getResultsByStudent);
router.get('/result/batch', auth(['teacher', 'admin', 'exam_controller']), academicController.getResultsByBatch);

// New Publishing Routes
router.get('/result/overview/:batchId', auth(['teacher', 'admin', 'exam_controller']), academicController.getBatchResultOverview);
router.get('/result/details/:batchId', auth(['teacher', 'admin', 'exam_controller']), academicController.getBatchResultDetails);
router.post('/result/publish', auth(['teacher', 'admin']), academicController.publishResult); // Only Teachers/Admin convert Draft -> Published
router.post('/result/delete', auth(['teacher', 'admin', 'exam_controller']), academicController.deleteResult);
router.get('/result/analysis/college', auth(['teacher', 'admin', 'exam_controller']), academicController.getCollegeResultAnalysis);
router.get('/result/analysis/department', auth(['teacher', 'admin']), academicController.getDepartmentResultAnalysis); // EC doesn't have a department usually
router.get('/result/analysis/:batchId', auth(['teacher', 'admin', 'exam_controller']), academicController.getBatchResultAnalysis);

// Assignments
router.post('/assignment', auth('teacher'), academicController.createAssignment);
router.get('/assignment', auth(['student', 'teacher']), academicController.getAssignments);

module.exports = router;
