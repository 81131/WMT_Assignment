const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', protect, ctrl.logout);
router.get('/me', protect, ctrl.getMe);

// Staff management (main_manager only)
router.post('/users', protect, requireRole('main_manager'), ctrl.createStaff);
router.get('/users', protect, requireRole('main_manager'), ctrl.getAllUsers);
router.put('/users/:id', protect, requireRole('main_manager'), ctrl.updateUser);

module.exports = router;
