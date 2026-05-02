require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const branchRoutes = require('./routes/branchRoutes');
const hallRoutes = require('./routes/hallRoutes');
const movieRoutes = require('./routes/movieRoutes');
const timeSlotRoutes = require('./routes/timeSlotRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();

// Trust Railway's reverse proxy so X-Forwarded-For works correctly with rate limiting
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Security & utility middleware
app.use(helmet());
app.use(cors({ origin: '*' })); // Tighten in production
app.use(morgan('dev'));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required for PayHere webhook

// Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/auth', authLimiter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));
app.get('/', (req, res) => res.json({ success: true, message: 'Welcome to the Cinema Booking API!' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/halls', hallRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/timeslots', timeSlotRoutes);
app.use('/api', bookingRoutes); // /api/seats, /api/payments, /api/bookings, /api/tickets
app.use('/api/reviews', reviewRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🎬 Cinema API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️  Port ${PORT} is already in use.`);
    console.log(`   Run:  fuser -k ${PORT}/tcp   then restart.`);
    process.exit(1);
  } else {
    throw err;
  }
});

module.exports = app;
