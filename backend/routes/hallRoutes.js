const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/hallController');
const { protect, requireRole } = require('../middleware/authMiddleware');

const mgr = ['main_manager', 'branch_manager'];

router.get('/', protect, ctrl.getHalls);
router.get('/:id', protect, ctrl.getHallById);
router.post('/', protect, requireRole(...mgr), ctrl.createHall);
router.put('/:id', protect, requireRole(...mgr), ctrl.updateHall);
router.delete('/:id', protect, requireRole('main_manager'), ctrl.deleteHall);

module.exports = router;
