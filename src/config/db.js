const mongoose = require('mongoose');

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development and serverless function invocations in production.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true, // Re-enabled to prevent "Cannot call find() before connection" errors
      serverSelectionTimeoutMS: 8000, // Reduced to fit within Vercel's 10s limit
      family: 4,
    };

    cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((m) => {
      console.log('✅ MongoDB Connected (New Connection established)');
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
    if (!cached.conn) throw new Error('Mongoose connection failed');
  } catch (e) {
    cached.promise = null;
    console.error('❌ MongoDB connection error:', e.message);
    throw e; // Throw so the caller (middleware) knows it failed
  }

  return cached.conn;
}

module.exports = connectDB;
