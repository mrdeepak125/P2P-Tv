import mongoose from 'mongoose';

let isMongoConnected = false;

export async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/screenroom';
  try {
    // Attempt with low timeout so local startup is fast if mongo daemon is not running
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    isMongoConnected = true;
    console.log(`[Database] MongoDB connected successfully to ${uri}`);
  } catch (error) {
    isMongoConnected = false;
    console.log(`[Database] MongoDB not reachable (${error.message}). Seamlessly using persistent disk storage at server/data/rooms.json.`);
  }
}

export function getIsMongoConnected() {
  return isMongoConnected;
}

