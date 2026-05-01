const mongoose = require('mongoose');

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000; // start at 3s

const connectDB = async (attempt = 1) => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // 10s per attempt
      connectTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    const delay = RETRY_DELAY_MS * attempt; // grows: 3s, 6s, 9s...
    console.error(
      `❌ MongoDB connection error (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`
    );

    if (attempt >= MAX_RETRIES) {
      console.error('💀 Could not connect to MongoDB after multiple retries. Exiting.');
      process.exit(1);
    }

    console.log(`🔄 Retrying in ${delay / 1000}s...`);
    await new Promise((res) => setTimeout(res, delay));
    return connectDB(attempt + 1);
  }
};

module.exports = connectDB;
