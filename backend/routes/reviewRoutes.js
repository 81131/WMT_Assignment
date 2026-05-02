const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reviewController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.get('/', protect, ctrl.getReviews);
router.get('/stats/:movieId', protect, ctrl.getMovieStats);
router.get('/:id', protect, ctrl.getReviewById);
router.post('/', protect, requireRole('customer'), ctrl.createReview);
router.put('/:id', protect, requireRole('customer'), ctrl.updateReview);
router.put('/:id/moderate', protect, requireRole('branch_manager', 'main_manager'), ctrl.moderateReview);
router.delete('/:id', protect, ctrl.deleteReview);

module.exports = router;
