// Turns on refundable "safety money" for the existing rental vehicles so the second payment option
// (Advance / Safety money) shows up in the rider app.
//
//   node scripts/seedRentalSafetyMoney.js            -> dry run: only lists what would change
//   node scripts/seedRentalSafetyMoney.js --apply    -> writes the change
//   ... --apply --force                              -> also overwrites vehicles that already have safety money set
//
// Amounts (change them below): bikes/scooters Rs.500, every other vehicle Rs.2000.
import 'dotenv/config';
import mongoose from 'mongoose';
import { RentalVehicleType } from '../src/modules/taxi/admin/models/RentalVehicleType.js';

const SAFETY_AMOUNT_BY_CATEGORY = { bike: 500, scooter: 500 };
const DEFAULT_SAFETY_AMOUNT = 2000;
const NOTE = 'Refundable. The final bill is deducted at the end of the rental and the balance is refunded to your wallet.';

const apply = process.argv.includes('--apply');
const force = process.argv.includes('--force');

await mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 20000,
  dbName: process.env.MONGODB_DB_NAME || undefined,
});
console.log(`Database: ${mongoose.connection.name} @ ${mongoose.connection.host}`);

const vehicles = await RentalVehicleType.find({}).select('name vehicleCategory safetyMoney advancePayment status active').lean();
console.log(`${vehicles.length} rental vehicle(s) found. Mode: ${apply ? 'APPLY' : 'DRY RUN (nothing is written)'}\n`);

let changed = 0;
for (const vehicle of vehicles) {
  const category = String(vehicle.vehicleCategory || vehicle.name || '').toLowerCase();
  const amount = SAFETY_AMOUNT_BY_CATEGORY[category] ?? DEFAULT_SAFETY_AMOUNT;
  const hasSafety = Boolean(vehicle.safetyMoney?.enabled) && Number(vehicle.safetyMoney?.amount || 0) > 0;

  if (hasSafety && !force) {
    console.log(`- skip   ${vehicle.name} (${category || 'n/a'}): safety money already Rs.${vehicle.safetyMoney.amount}`);
    continue;
  }

  console.log(`- ${apply ? 'set   ' : 'would set'} ${vehicle.name} (${category || 'n/a'}): safety money Rs.${amount}; advance ${vehicle.advancePayment?.enabled ? `Rs.${vehicle.advancePayment.amount} (kept)` : 'off'}`);
  if (apply) {
    await RentalVehicleType.updateOne(
      { _id: vehicle._id },
      { $set: { safetyMoney: { enabled: true, amount, notes: NOTE } } },
    );
  }
  changed += 1;
}

console.log(`\n${apply ? 'Updated' : 'Would update'} ${changed} vehicle(s).`);
await mongoose.disconnect();
