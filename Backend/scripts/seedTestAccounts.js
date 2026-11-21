// Creates one verified Rider and one approved Driver for testing. Safe to run again (it updates, never duplicates).
//
//   node scripts/seedTestAccounts.js
//
// Both numbers are in services/staticOtpService.js, so they log in with OTP 1234 and no SMS is sent.
import 'dotenv/config';
import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../src/modules/taxi/user/models/User.js';
import { Driver } from '../src/modules/taxi/driver/models/Driver.js';

const USER_PHONE = '7610416911';
const DRIVER_PHONE = '9755633147';

// Same connection as the server (src/config/db.js): no dbName, so the URI's default database is used.
await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000, family: 4 });
console.log(`Database: ${mongoose.connection.name}`);

const user = await User.findOneAndUpdate(
  { phone: USER_PHONE },
  { $set: { name: 'Test Rider', countryCode: '+91', isVerified: true, isActive: true }, $setOnInsert: { phone: USER_PHONE } },
  { upsert: true, new: true },
);

// The driver app logs in by OTP, so the password is never used; store a random hash to satisfy the schema.
const password = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
const driver = await Driver.findOneAndUpdate(
  { phone: DRIVER_PHONE },
  {
    $set: { name: 'Test Driver', vehicleType: 'car', registerFor: 'taxi', approve: true, status: 'approved' },
    $setOnInsert: { phone: DRIVER_PHONE, password },
  },
  { upsert: true, new: true },
);

console.log(`Rider  : ${user.phone}  verified=${user.isVerified} active=${user.isActive}`);
console.log(`Driver : ${driver.phone}  approve=${driver.approve} status=${driver.status}`);
console.log('OTP for both: 1234');
await mongoose.disconnect();
