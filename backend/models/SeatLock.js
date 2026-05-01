const mongoose = require('mongoose');

// TTL-based seat lock to prevent double-booking race conditions
const seatLockSchema = new mongoose.Schema({
  timeSlot: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeSlot', required: true },
  seatId: { type: String, required: true },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  },
});

// MongoDB auto-deletes documents when expiresAt passes
seatLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Unique compound index: one lock per seat per timeslot
seatLockSchema.index({ timeSlot: 1, seatId: 1 }, { unique: true });

module.exports = mongoose.model('SeatLock', seatLockSchema);
