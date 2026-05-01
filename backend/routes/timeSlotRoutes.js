const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/timeSlotController');
const { protect, requireRole } = require('../middleware/authMiddleware');

const mgr = ['main_manager', 'branch_manager'];

router.get('/', protect, ctrl.getTimeSlots);
router.get('/:id', protect, ctrl.getTimeSlotById);
router.get('/:id/seats', protect, ctrl.getSeatAvailability);
router.post('/', protect, requireRole(...mgr), ctrl.createTimeSlot);
router.put('/:id', protect, requireRole(...mgr), ctrl.updateTimeSlot);
router.delete('/:id', protect, requireRole(...mgr), ctrl.deleteTimeSlot);

module.exports = router;
