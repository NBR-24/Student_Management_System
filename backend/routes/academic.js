const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academic');
const auth = require('../middleware/auth');
const multer = require('multer'); // Added for file uploads

const upload = multer(); // Added for file uploads

// Results
// Results
router.post('/result', auth('teacher'), academicController.addResult);
router.post('/result/upload', auth('exam_controller'), upload.single('file'), academicController.uploadResultPDF);
router.get('/result/student', auth('student'), academicController.getResultsByStudent);
router.get('/result/batch', auth(['teacher', 'admin', 'exam_controller', 'hod', 'principal']), academicController.getResultsByBatch);

// New Publishing Routes
router.get('/result/draft-overview', auth(['teacher', 'admin', 'exam_controller', 'hod', 'principal']), academicController.getDraftResultOverview);
router.get('/result/overview', auth(['teacher', 'admin', 'exam_controller', 'hod', 'principal']), academicController.getAllResultOverview);
router.get('/result/overview/:batchId', auth(['teacher', 'admin', 'exam_controller', 'hod', 'principal']), academicController.getBatchResultOverview);
router.get('/result/details/all', auth(['teacher', 'admin', 'exam_controller', 'hod', 'principal']), academicController.getAllResultDetails);
router.get('/result/details/:batchId', auth(['teacher', 'admin', 'exam_controller', 'hod', 'principal']), academicController.getBatchResultDetails);
router.get('/result/download/all', auth(['teacher', 'admin', 'exam_controller', 'hod', 'principal']), academicController.downloadResultExcelGlobal);
router.get('/result/download/:batchId', auth(['teacher', 'admin', 'exam_controller', 'hod', 'principal']), academicController.downloadBatchResult);
router.post('/result/publish', auth('exam_controller'), academicController.publishResult);
router.post('/result/delete', auth('exam_controller'), academicController.deleteResult);
router.get('/result/analysis/college', auth(['teacher', 'admin', 'exam_controller', 'hod', 'principal']), academicController.getCollegeResultAnalysis);
router.get('/result/analysis/department', auth(['teacher', 'admin', 'exam_controller', 'hod', 'principal']), academicController.getDepartmentResultAnalysis);
router.get('/result/analysis/:batchId', auth(['teacher', 'admin', 'exam_controller', 'hod', 'principal']), academicController.getBatchResultAnalysis);

// Assignments
router.post('/assignment', auth('teacher'), academicController.createAssignment);
router.get('/assignment', auth(['student', 'teacher']), academicController.getAssignments);

module.exports = router;
