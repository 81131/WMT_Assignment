const mongoose = require('mongoose');

const bookedSeatSchema = new mongoose.Schema(
  {
    seatId: { type: String, required: true },
    seatType: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timeSlot: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeSlot', required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    hall: { type: mongoose.Schema.Types.ObjectId, ref: 'Hall', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    seats: [bookedSeatSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'used'],
      default: 'pending',
    },
    ticketCode: { type: String, unique: true, sparse: true },
    qrCodeUrl: { type: String, default: null },
    // PayHere fields
    paymentOrderId: { type: String, unique: true, sparse: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    // Scan/validation
    usedAt: { type: Date, default: null },
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

bookingSchema.index({ customer: 1, status: 1 });
bookingSchema.index({ timeSlot: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
