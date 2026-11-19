// Demo data to test "Rental with Driver", service centers and staff. Safe to run again: it never duplicates.
//
//   node scripts/seedDriverRentalDemo.js            -> dry run: only says what it would add
//   node scripts/seedDriverRentalDemo.js --apply    -> writes the data
//
// Adds: one demo service center with an owner login and two staff logins, listed drivers, with-driver vehicles with
// their own packages, links from the demo center to the existing self-drive rental vehicles, and a few sample requests.
// Logins use the phone number + OTP. With USE_DEFAULT_OTP=true in .env (development) the OTP is STATIC_OTP_CODE (1234).
import 'dotenv/config';
import mongoose from 'mongoose';
import { ServiceStore } from '../src/modules/taxi/admin/models/ServiceStore.js';
import { ServiceCenterStaff } from '../src/modules/taxi/admin/models/ServiceCenterStaff.js';
import { RentalVehicleType } from '../src/modules/taxi/admin/models/RentalVehicleType.js';
import { RentalQuoteRequest } from '../src/modules/taxi/admin/models/RentalQuoteRequest.js';
import { RentalDriver, RentalDriverBooking, RentalDriverVehicle } from '../src/modules/taxi/admin/models/DriverRental.js';
import { User } from '../src/modules/taxi/user/models/User.js';

const apply = process.argv.includes('--apply');

const CENTER = { name: 'Kailo Demo Rental Center', owner_name: 'Demo Center Owner', owner_phone: '9000000101', address: 'Vijay Nagar, Indore, Madhya Pradesh' };
const STAFF = [
  { name: 'Demo Staff Ravi', phone: '9000000102' },
  { name: 'Demo Staff Neha', phone: '9000000103' },
];
const DRIVERS = [
  { name: 'Ramesh Yadav', phone: '9000000201', licenseNumber: 'MP09 20150012345', experienceYears: 12, languages: ['Hindi', 'English'] },
  { name: 'Sunil Patel', phone: '9000000202', licenseNumber: 'MP09 20180023456', experienceYears: 8, languages: ['Hindi', 'Gujarati'] },
  { name: 'Imran Khan', phone: '9000000203', licenseNumber: 'MP09 20120034567', experienceYears: 15, languages: ['Hindi', 'Urdu', 'English'] },
  { name: 'Deepak Sharma', phone: '9000000204', licenseNumber: 'MP09 20200045678', experienceYears: 5, languages: ['Hindi'] },
  { name: 'Mohan Verma', phone: '9000000205', licenseNumber: 'MP09 20170056789', experienceYears: 9, languages: ['Hindi', 'English', 'Marathi'] },
];
const VEHICLES = [
  {
    name: 'Maruti Swift Dzire', vehicleCategory: 'Sedan', capacity: 4, luggageCapacity: 2,
    description: 'Comfortable AC sedan with a verified driver. Good for city trips and airport runs.',
    amenities: ['AC', 'Verified driver', 'Music system', 'Phone charger'],
    packages: [
      { label: '4 hours / 40 km', durationHours: 4, kmLimit: 40, price: 1200, extraHourPrice: 250, extraKmPrice: 14 },
      { label: '8 hours / 80 km', durationHours: 8, kmLimit: 80, price: 2200, extraHourPrice: 250, extraKmPrice: 14 },
      { label: 'Full day 12 hours / 120 km', durationHours: 12, kmLimit: 120, price: 3000, extraHourPrice: 250, extraKmPrice: 14 },
    ],
  },
  {
    name: 'Toyota Innova Crysta', vehicleCategory: 'SUV', capacity: 7, luggageCapacity: 4,
    description: 'Spacious 7 seater for families and groups, with an experienced driver.',
    amenities: ['AC', 'Verified driver', '7 seats', 'Extra luggage space'],
    packages: [
      { label: '4 hours / 40 km', durationHours: 4, kmLimit: 40, price: 2000, extraHourPrice: 400, extraKmPrice: 18 },
      { label: '8 hours / 80 km', durationHours: 8, kmLimit: 80, price: 3500, extraHourPrice: 400, extraKmPrice: 18 },
      { label: 'Full day 12 hours / 120 km', durationHours: 12, kmLimit: 120, price: 4800, extraHourPrice: 400, extraKmPrice: 18 },
    ],
  },
  {
    name: 'Tempo Traveller 12 Seater', vehicleCategory: 'Van', capacity: 12, luggageCapacity: 8,
    description: 'For weddings, tours and office trips. Driver and fuel handling included in the package.',
    amenities: ['AC', 'Verified driver', '12 seats', 'Pushback seats'],
    packages: [
      { label: '8 hours / 80 km', durationHours: 8, kmLimit: 80, price: 5500, extraHourPrice: 600, extraKmPrice: 24 },
      { label: 'Full day 12 hours / 120 km', durationHours: 12, kmLimit: 120, price: 7500, extraHourPrice: 600, extraKmPrice: 24 },
      { label: 'Outstation day 300 km', durationHours: 24, kmLimit: 300, price: 9500, extraHourPrice: 600, extraKmPrice: 22 },
    ],
  },
];
// A vehicle the demo center added itself, so the center can edit it from its own app.
const CENTER_VEHICLE = {
  name: 'Maruti WagonR (center listing)', vehicleCategory: 'Hatchback', capacity: 4, luggageCapacity: 1,
  description: 'Budget hatchback with driver, listed by the demo center.',
  amenities: ['AC', 'Verified driver'],
  packages: [
    { label: '4 hours / 40 km', durationHours: 4, kmLimit: 40, price: 900, extraHourPrice: 200, extraKmPrice: 12 },
    { label: '8 hours / 80 km', durationHours: 8, kmLimit: 80, price: 1600, extraHourPrice: 200, extraKmPrice: 12 },
  ],
};

await mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 20000,
  dbName: process.env.MONGODB_DB_NAME || undefined,
});
console.log(`Database: ${mongoose.connection.name} @ ${mongoose.connection.host}`);
console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN (nothing is written)'}\n`);

const log = (verb, what) => console.log(`- ${apply ? verb : `would ${verb}`} ${what}`);

// ---- 1. the demo center (placed next to an existing starter center, which already has a zone and a location)
const template = await ServiceStore.findOne({ zone_id: { $ne: null }, service_location_id: { $ne: null } }).sort({ createdAt: 1 }).lean();
if (!template) {
  console.log('No service center with a zone exists yet. Add one in Admin > Service Stores first, then run this again.');
  await mongoose.disconnect();
  process.exit(1);
}

let center = await ServiceStore.findOne({ owner_phone: CENTER.owner_phone, name: CENTER.name });
if (center) {
  log('keep', `center "${CENTER.name}"`);
} else {
  log('create', `center "${CENTER.name}" (owner login ${CENTER.owner_phone})`);
  if (apply) {
    center = await ServiceStore.create({
      ...CENTER,
      zone_id: template.zone_id,
      service_location_id: template.service_location_id,
      latitude: 22.7533,
      longitude: 75.8937,
      location: { type: 'Point', coordinates: [75.8937, 22.7533] },
      status: 'active',
      active: true,
    });
  }
}
const centerId = center?._id || new mongoose.Types.ObjectId();

// ---- 2. staff
for (const member of STAFF) {
  const existing = await ServiceCenterStaff.findOne({ phone: member.phone });
  if (existing) {
    log('keep', `staff ${member.name} (${member.phone})${String(existing.serviceCenterId) === String(centerId) ? '' : ' - belongs to another center, left as is'}`);
  } else {
    log('create', `staff ${member.name} (login ${member.phone})`);
    if (apply) await ServiceCenterStaff.create({ serviceCenterId: centerId, name: member.name, phone: member.phone, active: true, status: 'active' });
  }
}

// ---- 3. listed drivers
for (const driver of DRIVERS) {
  const existing = await RentalDriver.findOne({ serviceCenterId: centerId, phone: driver.phone });
  if (existing) {
    log('keep', `driver ${driver.name}`);
  } else {
    log('create', `driver ${driver.name} (${driver.experienceYears} yrs)`);
    if (apply) await RentalDriver.create({ serviceCenterId: centerId, ...driver, active: true, status: 'active' });
  }
}

// ---- 4. with-driver vehicles and their packages (reuse the picture of a matching self-drive vehicle when there is one)
const selfDrive = await RentalVehicleType.find({}).select('name vehicleCategory image').lean();
const pictureFor = (category) =>
  selfDrive.find((item) => String(item.vehicleCategory || '').toLowerCase().includes(String(category).toLowerCase().slice(0, 3)))?.image || '';

for (const [index, vehicle] of [...VEHICLES, CENTER_VEHICLE].entries()) {
  const centerOwned = index === VEHICLES.length;
  const existing = await RentalDriverVehicle.findOne({ name: vehicle.name });
  if (existing) {
    log('keep', `with-driver vehicle ${vehicle.name}`);
  } else {
    log('create', `with-driver vehicle ${vehicle.name} with ${vehicle.packages.length} packages${centerOwned ? ' (owned by the demo center)' : ''}`);
    if (apply) {
      await RentalDriverVehicle.create({
        ...vehicle,
        image: pictureFor(vehicle.vehicleCategory),
        serviceCenterIds: [centerId],
        ownerCenterId: centerOwned ? centerId : null,
        active: true,
        status: 'active',
      });
    }
  }
}

// ---- 5. link the demo center to the existing self-drive rental vehicles, so their quotes and bookings reach it too
const toLink = await RentalVehicleType.find({ serviceStoreIds: { $ne: centerId } }).select('name').lean();
log('link', `the demo center to ${toLink.length} self-drive rental vehicle(s)${toLink.length ? `: ${toLink.map((item) => item.name).join(', ')}` : ''}`);
if (apply && toLink.length) {
  await RentalVehicleType.updateMany({ _id: { $in: toLink.map((item) => item._id) } }, { $addToSet: { serviceStoreIds: centerId } });
}

// ---- 6. a few sample requests so the center app is not empty (needs one existing rider)
const rider = await User.findOne({ phone: { $exists: true, $ne: '' } }).select('name phone').lean();
if (!rider) {
  console.log('- skip sample requests: no rider account exists yet (sign in once in the rider app, then run this again)');
} else {
  const demoVehicle = apply ? await RentalDriverVehicle.findOne({ name: VEHICLES[0].name }).lean() : null;
  const pkg = demoVehicle?.packages?.[1];
  if (await RentalDriverBooking.exists({ bookingReference: 'DRV-DEMO001' })) {
    log('keep', 'sample with-driver booking DRV-DEMO001');
  } else {
    log('create', 'sample with-driver booking DRV-DEMO001 (pending)');
    if (apply && demoVehicle && pkg) {
      await RentalDriverBooking.create({
        bookingReference: 'DRV-DEMO001',
        userId: rider._id,
        driverVehicleId: demoVehicle._id,
        vehicleName: demoVehicle.name,
        vehicleCategory: demoVehicle.vehicleCategory,
        vehicleImage: demoVehicle.image || '',
        selectedPackage: { packageId: String(pkg._id), label: pkg.label, durationHours: pkg.durationHours, kmLimit: pkg.kmLimit, price: pkg.price, extraHourPrice: pkg.extraHourPrice, extraKmPrice: pkg.extraKmPrice },
        totalCost: pkg.price,
        pickupDateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        pickupLocation: 'Vijay Nagar Square, Indore',
        dropLocation: 'Indore Airport',
        notes: 'Demo booking for testing',
        contactName: rider.name || 'Demo Rider',
        contactPhone: String(rider.phone).replace(/\D/g, '').slice(-10),
        status: 'pending',
        serviceCenterIds: [centerId],
      });
    }
  }

  if (await RentalQuoteRequest.exists({ specialRequirements: '[demo] with driver quote' })) {
    log('keep', 'sample custom quote (with driver)');
  } else {
    log('create', 'sample custom quote (with driver) and one for a self-drive vehicle');
    if (apply && demoVehicle) {
      const contactPhone = String(rider.phone).replace(/\D/g, '').slice(-10);
      const base = { userId: rider._id, contactName: rider.name || 'Demo Rider', contactPhone, requestedHours: 10, seatsNeeded: 4, luggageNeeded: 2, pickupLocation: 'Rajwada, Indore', dropLocation: 'Ujjain', pickupDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), returnDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 10 * 3600 * 1000), status: 'pending', serviceCenterIds: [centerId] };
      await RentalQuoteRequest.create({ ...base, serviceMode: 'with_driver', driverVehicleId: demoVehicle._id, vehicleName: demoVehicle.name, vehicleCategory: demoVehicle.vehicleCategory, specialRequirements: '[demo] with driver quote' });
      const selfVehicle = await RentalVehicleType.findOne({}).select('name vehicleCategory').lean();
      if (selfVehicle) {
        await RentalQuoteRequest.create({ ...base, serviceMode: 'self_drive', vehicleTypeId: selfVehicle._id, vehicleName: selfVehicle.name, vehicleCategory: selfVehicle.vehicleCategory, specialRequirements: '[demo] self drive quote' });
      }
    }
  }
}

console.log(`
${apply ? 'Done.' : 'Dry run finished. Run again with --apply to write this.'}

LOGIN (service center app: open /taxi/driver/login, choose Service Center or Center Staff)
  Center owner : ${CENTER.owner_phone}
  Staff 1      : ${STAFF[0].phone}  (${STAFF[0].name})
  Staff 2      : ${STAFF[1].phone}  (${STAFF[1].name})
  OTP          : ${process.env.USE_DEFAULT_OTP === 'true' ? (process.env.STATIC_OTP_CODE || '1234') : 'a real SMS OTP (USE_DEFAULT_OTP is not true in .env)'}
`);
await mongoose.disconnect();
