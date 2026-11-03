import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/database';
import { Admin } from '../models/Admin';
import { env } from '../config/environment';

async function seedAdmin() {
  console.log('--- CST LAN Challenge 2026: Admin Setup Script ---');
  const db = await connectDatabase();
  if (!db) {
    console.error('Cannot seed admin because MongoDB connection is not established. Please whitelist IP on Atlas.');
    process.exit(1);
  }

  const username = env.ADMIN_USERNAME || 'admin';
  const email = env.ADMIN_EMAIL || 'admin@cst.uwu.ac.lk';
  const password = env.ADMIN_PASSWORD || 'admin12345';

  const existing = await Admin.findOne({
    $or: [{ username }, { email }],
  });

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.isActive = true;
    existing.role = 'SUPER_ADMIN';
    await existing.save();
    console.log(`Updated existing administrator credentials for: ${existing.username} (${existing.email})`);
  } else {
    const created = await Admin.create({
      username,
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    });
    console.log(`Created new SUPER_ADMIN account: ${created.username} (${created.email})`);
  }

  console.log('Admin account ready for authentication.');
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Failed to seed admin account:', err);
  process.exit(1);
});
