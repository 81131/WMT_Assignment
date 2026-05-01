const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/branchController');
const { protect, requireRole } = require('../middleware/authMiddleware');

const mgr = ['main_manager', 'branch_manager'];

router.get('/', protect, ctrl.getBranches);
router.get('/:id', protect, ctrl.getBranchById);
router.post('/', protect, requireRole('main_manager'), ctrl.createBranch);
router.put('/:id', protect, requireRole('main_manager'), ctrl.updateBranch);
router.delete('/:id', protect, requireRole('main_manager'), ctrl.deleteBranch);
router.post('/:id/restore', protect, requireRole('main_manager'), ctrl.restoreBranch);

module.exports = router;
