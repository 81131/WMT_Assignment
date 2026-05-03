const Movie = require('../models/Movie');
const cloudinary = require('../config/cloudinary');

// GET /api/movies?branch=&genre=&search=
exports.getMovies = async (req, res) => {
  const query = { isActive: true };

  if (req.user.role === 'branch_manager') {
    query.branches = req.user.assignedBranch;
  } else if (req.query.branch) {
    query.branches = req.query.branch;
  }

  if (req.query.genre) query.genre = { $in: [req.query.genre] };
  if (req.query.search) {
    query.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const movies = await Movie.find(query).populate('branches', 'name city').lean();

  const Review = require('../models/Review');
  for (let m of movies) {
    const stats = await Review.aggregate([
      { $match: { movie: m._id } },
      { $group: { _id: null, avgRating: { $avg: '$movieRating' } } }
    ]);
    m.avgStarRating = stats[0] ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  }

  res.json({ success: true, count: movies.length, movies });
};

// GET /api/movies/actors/distinct
exports.getDistinctActors = async (req, res) => {
  // Extract distinct actor names across all movies
  const actors = await Movie.distinct('cast.name');
  res.json({ success: true, actors: actors.filter(Boolean).sort() });
};

// POST /api/movies/upload-image
exports.uploadImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded.' });
  res.json({ success: true, imageUrl: req.file.path });
};

// GET /api/movies/:id
exports.getMovieById = async (req, res) => {
  const movie = await Movie.findById(req.params.id).populate('branches', 'name city address');
  if (!movie) return res.status(404).json({ success: false, message: 'Movie not found.' });
  res.json({ success: true, movie });
};

// POST /api/movies
exports.createMovie = async (req, res) => {
  let { title, description, genre, duration, language, rating, cast, trailerUrl, branches } = req.body;

  // Branch manager can only add to their branch
  if (req.user.role === 'branch_manager') {
    branches = [req.user.assignedBranch];
  }

  const movie = await Movie.create({
    title, description, genre, duration, language, rating, cast, trailerUrl, branches,
  });
  res.status(201).json({ success: true, movie });
};

// PUT /api/movies/:id
exports.updateMovie = async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) return res.status(404).json({ success: false, message: 'Movie not found.' });

  if (req.user.role === 'branch_manager' &&
    !movie.branches.some(b => b.toString() === req.user.assignedBranch?.toString())) {
    return res.status(403).json({ success: false, message: 'Access denied to this movie.' });
  }

  let { title, description, genre, duration, language, rating, cast, trailerUrl, isActive, branches } = req.body;
  
  if (req.user.role === 'branch_manager') {
    // Preserve existing branches, we don't want a branch manager wiping other branches
    // Alternatively, we just ignore `branches` payload for branch manager
    branches = movie.branches;
  }

  Object.assign(movie, { title, description, genre, duration, language, rating, cast, trailerUrl, isActive, branches });
  await movie.save();

  res.json({ success: true, movie });
};

// DELETE /api/movies/:id  (soft deactivate)
exports.deleteMovie = async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) return res.status(404).json({ success: false, message: 'Movie not found.' });

  if (req.user.role === 'branch_manager' &&
    !movie.branches.some(b => b.toString() === req.user.assignedBranch?.toString())) {
    return res.status(403).json({ success: false, message: 'Access denied to this movie.' });
  }

  movie.isActive = false;
  await movie.save();
  res.json({ success: true, message: 'Movie deactivated.' });
};

// POST /api/movies/:id/poster  — Upload poster to Cloudinary
exports.uploadPoster = async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) return res.status(404).json({ success: false, message: 'Movie not found.' });

  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  // req.file.path is the Cloudinary URL when using multer-storage-cloudinary
  movie.posterUrl = req.file.path;
  await movie.save();

  res.json({ success: true, posterUrl: movie.posterUrl });
};
