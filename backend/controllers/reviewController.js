const Review = require('../models/Review');
const Booking = require('../models/Booking');

// GET /api/reviews?movie=&hall=&branch=
exports.getReviews = async (req, res) => {
  const query = {};
  if (req.query.movie) query.movie = req.query.movie;
  if (req.query.hall) query.hall = req.query.hall;
  if (req.query.branch) query.branch = req.query.branch;
  if (req.query.booking) query.booking = req.query.booking;
  let reviews = await Review.find(query)
    .populate('customer', 'name')
    .populate('movie', 'title')
    .populate('hall', 'name')
    .sort({ createdAt: -1 })
    .lean();

  if (req.user.role === 'customer') {
    reviews = reviews.map(r => {
      if (r.isBlurred) {
        r.comment = '[This review has been hidden by a moderator.]';
      }
      return r;
    });
  }

  res.json({ success: true, count: reviews.length, reviews });
};

// GET /api/reviews/:id
exports.getReviewById = async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate('customer', 'name').populate('movie', 'title').populate('hall', 'name');
  if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
  res.json({ success: true, review });
};

// POST /api/reviews  — Customer only, after ticket is 'used'
exports.createReview = async (req, res) => {
  const { bookingId, movieRating, hallRating, facilityRating, comment } = req.body;

  const booking = await Booking.findOne({ _id: bookingId, customer: req.user._id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (booking.status !== 'used') {
    return res.status(403).json({ success: false, message: 'You can only review after your ticket has been scanned.' });
  }

  const existing = await Review.findOne({ booking: bookingId });
  if (existing) return res.status(409).json({ success: false, message: 'You have already reviewed this booking.' });

  const review = await Review.create({
    booking: bookingId,
    customer: req.user._id,
    movie: booking.movie,
    hall: booking.hall,
    branch: booking.branch,
    movieRating,
    hallRating,
    facilityRating,
    comment,
  });
  res.status(201).json({ success: true, review });
};

// PUT /api/reviews/:id  — Edit own review
exports.updateReview = async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, customer: req.user._id });
  if (!review) return res.status(404).json({ success: false, message: 'Review not found or access denied.' });
  const { movieRating, hallRating, facilityRating, comment } = req.body;
  Object.assign(review, { movieRating, hallRating, facilityRating, comment });
  await review.save();
  res.json({ success: true, review });
};

// DELETE /api/reviews/:id  — Own review or manager
exports.deleteReview = async (req, res) => {
  const query = req.user.role === 'main_manager'
    ? { _id: req.params.id }
    : { _id: req.params.id, customer: req.user._id };
  const review = await Review.findOneAndDelete(query);
  if (!review) return res.status(404).json({ success: false, message: 'Review not found or access denied.' });
  res.json({ success: true, message: 'Review deleted.' });
};

// GET /api/reviews/stats/:movieId  — Aggregate rating stats
exports.getMovieStats = async (req, res) => {
  const stats = await Review.aggregate([
    { $match: { movie: new (require('mongoose').Types.ObjectId)(req.params.movieId) } },
    {
      $group: {
        _id: '$movie',
        avgMovieRating: { $avg: '$movieRating' },
        avgHallRating: { $avg: '$hallRating' },
        avgFacilityRating: { $avg: '$facilityRating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);
  res.json({ success: true, stats: stats[0] || { avgMovieRating: 0, totalReviews: 0 } });
};
// PUT /api/reviews/:id/moderate  — Manager only
exports.moderateReview = async (req, res) => {
  const { isBlurred, managerResponse } = req.body;
  const review = await Review.findById(req.params.id);

  if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

  // Branch managers can only moderate reviews for their branch
  if (req.user.role === 'branch_manager' && review.branch.toString() !== req.user.assignedBranch?.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied to moderate this branch review.' });
  }

  if (isBlurred !== undefined) review.isBlurred = isBlurred;
  if (managerResponse !== undefined) review.managerResponse = managerResponse;

  await review.save();
  res.json({ success: true, review });
};
