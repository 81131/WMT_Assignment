const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    seatId: { type: String, required: true }, // e.g. "A1", "B3"
    type: {
      type: String,
      enum: ['regular', 'vip', 'loveseat', 'producer', 'lobby'],
      default: 'regular',
    },
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    isActive: { type: Boolean, default: true }, // false = aisle/gap
  },
  { _id: false }
);

const hallSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true, trim: true },
    screenType: {
      type: String,
      enum: ['2D', '3D', '4DX', 'IMAX'],
      default: '2D',
    },
    layoutConfig: {
      rows: { type: Number, required: true, min: 1, max: 30 },
      cols: { type: Number, required: true, min: 1, max: 30 },
      seats: [seatSchema],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Hall', hallSchema);
