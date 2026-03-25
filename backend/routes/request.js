const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/request');
const auth       = require('../middleware/auth');

const APPROVER_ROLES = ['teacher', 'hod', 'principal'];

// Student — create & view
router.post('/',                  auth('student'),        ctrl.createRequest);
router.get('/my',                 auth('student'),        ctrl.getMyRequests);
router.post('/:id/resubmit',      auth('student'),        ctrl.resubmitRequest);

// Approvers — pending queue + actions
router.get('/pending',            auth(APPROVER_ROLES),   ctrl.getPendingRequests);
router.get('/history',            auth(APPROVER_ROLES),   ctrl.getApproverHistory);
router.post('/:id/approve',       auth(APPROVER_ROLES),   ctrl.approveRequest);
router.post('/:id/reject',        auth(APPROVER_ROLES),   ctrl.rejectRequest);

// PDF download — any authenticated user
router.get('/:id/pdf',            auth(['student', ...APPROVER_ROLES, 'admin']), ctrl.downloadPDF);

// Staff list — for flow builder dropdown (student uses this)
router.get('/staff',              auth('student'),        ctrl.getStaff);

// PUBLIC — QR code verification (no auth)
router.get('/verify/:reqId',      ctrl.verifyRequest);

module.exports = router;
