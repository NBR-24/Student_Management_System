const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin');
const auth = require('../middleware/auth');

// Protected route: Only admin can access
// Protected route: Only admin can access
router.post('/staff', auth('admin'), adminController.addStaff);
router.get('/staff', auth('admin'), adminController.getStaff);
router.put('/staff/:id', auth('admin'), adminController.updateStaff);
router.delete('/staff/:id', auth('admin'), adminController.deleteStaff);

module.exports = router;
