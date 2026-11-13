// Creates (or resets the password of) a superadmin.
//
//   node scripts/createAdmin.js
//   ADMIN_EMAIL=me@x.com ADMIN_PASSWORD=Secret@123 node scripts/createAdmin.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { Admin } from '../src/modules/taxi/admin/models/Admin.js';

const email = (process.env.ADMIN_EMAIL || 'admin@kailo.com').trim().toLowerCase();
// No default password: a known default would let anyone into a fresh admin panel.
const password = String(process.env.ADMIN_PASSWORD || '');
if (password.length < 8) {
  console.error('Set ADMIN_PASSWORD (at least 8 characters). Example: ADMIN_PASSWORD=YourStrongPass node scripts/createAdmin.js');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 20000,
  dbName: process.env.MONGODB_DB_NAME || undefined,
});

let admin = await Admin.findOne({ email });
if (admin) {
  admin.password = password; // hashed by pre-save hook
  admin.active = true;
  admin.isActive = true;
  admin.status = 'active';
  await admin.save();
  console.log('Existing admin password reset.');
} else {
  await Admin.create({
    email,
    password,
    name: 'Super Admin',
    role: 'ADMIN',
    admin_type: 'superadmin',
    permissions: ['*'],
    servicesAccess: ['taxi'],
  });
  console.log('Admin created.');
}
// The password is never printed (terminal history / CI logs keep it).
console.log(`Email: ${email} (password: the ADMIN_PASSWORD you set)`);
await mongoose.disconnect();
