const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/movieController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'cinema/posters', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
});
const upload = multer({ storage });

const mgr = ['main_manager', 'branch_manager'];

router.get('/', protect, ctrl.getMovies);
router.get('/:id', protect, ctrl.getMovieById);
router.post('/', protect, requireRole(...mgr), ctrl.createMovie);
router.put('/:id', protect, requireRole(...mgr), ctrl.updateMovie);
router.delete('/:id', protect, requireRole(...mgr), ctrl.deleteMovie);
router.post('/:id/poster', protect, requireRole(...mgr), upload.single('poster'), ctrl.uploadPoster);

module.exports = router;
