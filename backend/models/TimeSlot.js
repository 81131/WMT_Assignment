const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    hall: { type: mongoose.Schema.Types.ObjectId, ref: 'Hall', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true }, // auto-computed
    interventionTime: { type: Number, default: 0 },
    pricing: {
      regular: { type: Number, required: true, min: 0 },
      vip: { type: Number, required: true, min: 0 },
      loveseat: { type: Number, required: true, min: 0 },
      producer: { type: Number, required: true, min: 0 },
      lobby: { type: Number, required: true, min: 0 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for conflict detection queries
timeSlotSchema.index({ hall: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('TimeSlot', timeSlotSchema);
