// Creates (or resets the password of) a superadmin.
//
//   node scripts/createAdmin.js
//   ADMIN_EMAIL=me@x.com ADMIN_PASSWORD=Secret@123 node scripts/createAdmin.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { Admin } from '../src/modules/taxi/admin/models/Admin.js';

const email = (process.env.ADMIN_EMAIL || 'admin@kailo.com').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || 'Admin@1234';

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
console.log(`Email: ${email}\nPassword: ${password}`);
await mongoose.disconnect();
