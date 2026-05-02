const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    genre: [{ type: String }],
    duration: { type: Number, required: true }, // minutes
    language: { type: String, required: true },
    rating: { type: String, enum: ['G', 'PG', 'PG-13', 'R', 'NC-17'], default: 'PG' },
    cast: [{ 
      name: { type: String, required: true },
      photoUrl: { type: String, default: null }
    }],
    posterUrl: { type: String, default: null },
    trailerUrl: { type: String, default: null },
    branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Text index for search
movieSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Movie', movieSchema);
