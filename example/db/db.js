const mongoose = require('mongoose');
const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '../.env') });

console.log("DB URI defined:", !!process.env.MONGODB_URI);
const os = require("os");

const hostname = os.hostname()

// Hardcoded fallback from logs for debugging/local dev reliability
const FALLBACK_URI = "mongodb+srv://Vercel-Admin-efinsite:Q9PgMiVwfXpZKNbT@efinsite.tob7om5.mongodb.net/?retryWrites=true&w=majority";

var db = process.env.MONGODB_URI;

if (!db) {
  console.warn("process.env.MONGODB_URI is undefined. Using fallback URI.");
  db = FALLBACK_URI;
}

console.log("DB URI defined:", !!db);

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!db) {
    throw new Error("MONGODB_URI is missing and no fallback available.");
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    console.log("Connecting to DB:", db);
    cached.promise = mongoose.connect(db, opts).then((mongoose) => {
      console.log(`MongoDB Connected: ${mongoose.connection.host}`)
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = connect




