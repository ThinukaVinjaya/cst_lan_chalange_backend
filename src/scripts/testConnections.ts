import mongoose from 'mongoose';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { env } from '../config/environment';
import { Admin } from '../models/Admin';
import bcrypt from 'bcryptjs';

async function runDiagnostics() {
  console.log('===========================================================');
  console.log('🔍 CST LAN CHALLENGE 2026 - FULL CONNECTION DIAGNOSTICS');
  console.log('===========================================================');

  // 1. Check Cloudinary
  console.log('\n[1/3] Testing Cloudinary connection...');
  if (!isCloudinaryConfigured()) {
    console.error('❌ Cloudinary is not configured. Missing credentials in .env');
  } else {
    try {
      console.log(`Pinging Cloudinary cloud: ${env.CLOUDINARY_CLOUD_NAME}...`);
      const pingResult = await cloudinary.api.ping();
      console.log('✅ Cloudinary Ping SUCCESS:', pingResult);

      // Test upload of a tiny 1x1 png pixel
      const samplePixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const uploadRes = await cloudinary.uploader.upload(samplePixel, {
        folder: 'cst-lan-challenge/test',
        public_id: `diag_test_${Date.now()}`,
      });
      console.log('✅ Cloudinary Upload SUCCESS! URL:', uploadRes.secure_url);
    } catch (err: any) {
      console.error('❌ Cloudinary error:', err?.message || err);
    }
  }

  // 2. Check MongoDB Atlas
  console.log('\n[2/3] Testing MongoDB Atlas connection...');
  const maskedUri = env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  console.log(`Connecting to: ${maskedUri}`);

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`✅ MongoDB Atlas SUCCESS! Connected to database: "${conn.connection.name}"`);
    console.log(`Host: ${conn.connection.host}`);
    console.log(`Connection state: ${conn.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'}`);

    // 3. Check Admin in DB
    console.log('\n[3/3] Checking Admin User in MongoDB...');
    let admin = await Admin.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
    if (!admin) {
      console.log(`Admin ${env.ADMIN_EMAIL} not found. Creating seed admin...`);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, salt);
      admin = await Admin.create({
        username: env.ADMIN_USERNAME,
        email: env.ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
      });
      console.log(`✅ Admin user created: ${admin.username} (${admin.email})`);
    } else {
      console.log(`✅ Admin user verified in DB: ${admin.username} (${admin.email}) [Active: ${admin.isActive}]`);
      const isMatch = await bcrypt.compare(env.ADMIN_PASSWORD, admin.passwordHash);
      console.log(`Password match with .env: ${isMatch ? 'VERIFIED ✅' : 'MISMATCH ❌'}`);
    }

    await mongoose.disconnect();
    console.log('\n===========================================================');
    console.log('🎉 ALL DIAGNOSTICS COMPLETED');
    console.log('===========================================================');
  } catch (err: any) {
    console.error('\n❌ MongoDB Connection Error:', err?.message || err);
    if (err.name === 'MongooseServerSelectionError') {
      console.error('\n👉 Root Cause: MongoDB Atlas IP Whitelist restriction.');
      console.error('To allow connection:');
      console.error('1. Go to https://cloud.mongodb.com -> Network Access');
      console.error('2. Add IP Address -> Allow Access from Anywhere (0.0.0.0/0)');
      console.error('3. Save changes.\n');
    }
  }
}

runDiagnostics().catch(console.error);
