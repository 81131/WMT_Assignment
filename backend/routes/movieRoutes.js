const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/movieController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'cinema/posters', allowedFormats: ['jpg', 'jpeg', 'png', 'webp'] },
});
const upload = multer({ storage });

const actorStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'cinema/actors', allowedFormats: ['jpg', 'jpeg', 'png', 'webp'] },
});
const uploadActor = multer({ storage: actorStorage });

const mgr = ['main_manager', 'branch_manager'];

router.get('/', protect, ctrl.getMovies);
router.get('/actors/distinct', protect, ctrl.getDistinctActors);
router.post('/upload-image', protect, requireRole(...mgr), uploadActor.single('image'), ctrl.uploadImage);
router.get('/:id', protect, ctrl.getMovieById);
router.post('/', protect, requireRole(...mgr), ctrl.createMovie);
router.put('/:id', protect, requireRole(...mgr), ctrl.updateMovie);
router.delete('/:id', protect, requireRole(...mgr), ctrl.deleteMovie);
router.post('/:id/poster', protect, requireRole(...mgr), upload.single('poster'), ctrl.uploadPoster);

module.exports = router;
