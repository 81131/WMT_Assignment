const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true, // one review per booking
    },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    hall: { type: mongoose.Schema.Types.ObjectId, ref: 'Hall', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    movieRating: { type: Number, required: true, min: 1, max: 5 },
    hallRating: { type: Number, required: true, min: 1, max: 5 },
    facilityRating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
    isBlurred: { type: Boolean, default: false },
    managerResponse: { type: String, default: null },
  },
  { timestamps: true }
);

reviewSchema.index({ movie: 1 });
reviewSchema.index({ hall: 1 });

module.exports = mongoose.model('Review', reviewSchema);
