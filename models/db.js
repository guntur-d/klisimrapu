import mongoose from 'mongoose';
import 'dotenv/config'

// MongoDB connection URI
const mongoURI = process.env.MONGODB_URI;
// console.log(mongoURI);
// console.log(typeof(mongoURI))

/**
* Connect to MongoDB
* @returns {Promise} - MongoDB connection promise
*/
export const connectDB = async () => {
 try {
   const conn = await mongoose.connect(mongoURI);
   console.log(`MongoDB connected: ${conn.connection.host}`);
   return conn;
 } catch (err) {
   console.error('MongoDB connection error:', err);
   throw err;
 }
};

// Also maintain the old auto-connect behavior for existing code
mongoose.connect(mongoURI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Export mongoose for use in models and elsewhere
export default mongoose;