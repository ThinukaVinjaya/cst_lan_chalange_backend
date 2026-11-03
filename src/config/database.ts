import mongoose from 'mongoose';
import { env } from './environment';

// Disable long buffering so operations fail fast if database is disconnected
mongoose.set('bufferCommands', false);

let isConnected = false;

export const connectDatabase = async (): Promise<typeof mongoose | null> => {
  if (isConnected) return mongoose;

  try {
    const maskedUri = env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`Connecting to MongoDB Atlas: ${maskedUri}`);

    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });

    isConnected = true;
    console.log(`MongoDB Connected successfully to database: ${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB runtime error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('MongoDB connection lost. Reconnecting...');
    });

    return conn;
  } catch (error: any) {
    isConnected = false;
    console.error('\n===================================================================');
    console.error('⚠️  MONGODB ATLAS CONNECTION NOTICE:');
    console.error('Could not connect to MongoDB Atlas cluster.');
    if (error.name === 'MongooseServerSelectionError') {
      console.error('REASON: Your current IP address is not whitelisted in MongoDB Atlas.');
      console.error('FIX:');
      console.error(' 1. Log in to your MongoDB Atlas dashboard (https://cloud.mongodb.com)');
      console.error(' 2. Go to "Network Access" under the Security tab.');
      console.error(' 3. Click "Add IP Address" -> choose "Allow Access from Anywhere" (0.0.0.0/0)');
      console.error(' 4. Click Confirm. Connection will then establish immediately.');
    } else {
      console.error('Error detail:', error.message);
    }
    console.error('===================================================================\n');
    return null;
  }
};

export const getDbStatus = () => isConnected;
