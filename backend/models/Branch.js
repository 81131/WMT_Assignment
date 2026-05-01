const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: String, required: true },
    imageUrl: { type: String, default: null },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Soft-delete scope: add a static helper to exclude deleted branches
branchSchema.statics.findActive = function (query = {}) {
  return this.find({ ...query, isDeleted: false });
};

module.exports = mongoose.model('Branch', branchSchema);
