// Inserts a small, clearly-labelled set of TEST accounts and vehicles so every panel can be tried.
// Safe to re-run: records are matched by phone / plate / name and only created when missing.
//
//   node scripts/seedTestData.js
//
// With USE_DEFAULT_OTP=true in .env, every login OTP is STATIC_OTP_CODE (1234).
import 'dotenv/config';
import mongoose from 'mongoose';
import { Vehicle } from '../src/modules/taxi/admin/models/Vehicle.js';
import { Owner } from '../src/modules/taxi/admin/models/Owner.js';
import { FleetVehicle } from '../src/modules/taxi/admin/models/FleetVehicle.js';
import { ServiceLocation } from '../src/modules/taxi/admin/models/ServiceLocation.js';
import { BusService } from '../src/modules/taxi/admin/models/BusService.js';
import { PoolingVehicle } from '../src/modules/taxi/admin/models/PoolingVehicle.js';
import { GoodsType } from '../src/modules/taxi/admin/models/GoodsType.js';
import { Driver } from '../src/modules/taxi/driver/models/Driver.js';
import { BusDriver } from '../src/modules/taxi/driver/models/BusDriver.js';
import { hashPassword } from '../src/modules/taxi/services/passwordService.js';

const INDORE = { type: 'Point', coordinates: [75.8577, 22.7196] };
const PASSWORD = 'Test@1234';
const created = [];

const ensure = async (Model, filter, doc, label) => {
  const existing = await Model.findOne(filter);
  if (existing) {
    created.push(`= ${label} (already existed)`);
    return existing;
  }
  const made = await Model.create(doc);
  created.push(`+ ${label}`);
  return made;
};

await mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 20000,
  dbName: process.env.MONGODB_DB_NAME || undefined,
});
console.log('Connected to database:', mongoose.connection.db.databaseName);

const location = await ServiceLocation.findOne({ name: 'Indore' }).lean();
if (!location) throw new Error('No "Indore" service location found. Create one in the admin panel first.');

// ---------- vehicle types ----------
const type = (name, extra) =>
  ensure(Vehicle, { name }, { name, status: 1, active: true, ...extra }, `vehicle type "${name}"`);

// "both" lets one bike driver take rides AND parcels. A taxi-only vehicle type is never offered parcel requests.
const bikeType = await type('Bike', { transport_type: 'both', is_taxi: 'both', icon_types: 'bike', capacity: 1, short_description: 'Quick bike rides' });
if (bikeType.transport_type !== 'both') {
  await Vehicle.updateOne({ _id: bikeType._id }, { $set: { transport_type: 'both', is_taxi: 'both' } });
  created.push('~ vehicle type "Bike" now serves rides and parcels');
}
await type('Bike Parcel', { transport_type: 'delivery', icon_types: 'bike', delivery_category: '2wheeler', capacity: 1, short_description: 'Parcel delivery on two wheels' });
const suvType = await type('SUV', { transport_type: 'taxi', icon_types: 'suv', capacity: 6, short_description: 'Spacious SUV' });
const sedanType = await type('Sedan', { transport_type: 'taxi', icon_types: 'car', capacity: 4, short_description: 'Comfortable sedan' });

// ---------- drivers ----------
const password = await hashPassword(PASSWORD);
const driver = (phone, name, extra) =>
  ensure(
    Driver,
    { phone },
    {
      name,
      phone,
      password,
      email: `${phone}@test.kailotaxi.com`,
      city: 'Indore',
      service_location_id: location._id,
      location: INDORE,
      approve: true,
      status: 'approved',
      ...extra,
    },
    `driver ${phone} (${name})`,
  );

await driver('9000000001', 'Test Bike Parcel Rider', {
  vehicleType: 'bike',
  vehicleTypeId: bikeType._id,
  vehicleIconType: 'bike',
  vehicleMake: 'Honda',
  vehicleModel: 'Activa',
  vehicleNumber: 'MP09TB0001',
  vehicleColor: 'Orange',
  serviceCategories: ['taxi', 'delivery'],
  servicePreference: 'both',
});
await driver('9000000002', 'Test SUV Driver', {
  vehicleType: 'car',
  vehicleTypeId: suvType._id,
  vehicleIconType: 'suv',
  vehicleMake: 'Toyota',
  vehicleModel: 'Innova Crysta',
  vehicleNumber: 'MP09TS0002',
  vehicleColor: 'White',
  serviceCategories: ['taxi', 'outstation'],
});
await driver('9000000003', 'Test Pooling Driver', {
  vehicleType: 'car',
  vehicleTypeId: sedanType._id,
  vehicleIconType: 'car',
  vehicleMake: 'Maruti',
  vehicleModel: 'Dzire',
  vehicleNumber: 'MP09TP0003',
  vehicleColor: 'Silver',
  serviceCategories: ['taxi', 'pooling'],
});

// ---------- fleet owner (taxi) with one SUV and one driver ----------
const owner = (mobile, extra) =>
  ensure(
    Owner,
    { mobile },
    {
      mobile,
      phone: mobile,
      password,
      service_location_id: location._id,
      city: 'Indore',
      address: 'Vijay Nagar, Indore',
      active: true,
      approve: true,
      status: 'approved',
      ...extra,
    },
    `owner ${mobile} (${extra.company_name})`,
  );

const fleetOwner = await owner('9000000004', {
  company_name: 'Test Fleet Co',
  name: 'Test Fleet Owner',
  email: 'fleet.owner@test.kailotaxi.com',
  transport_type: 'taxi',
  no_of_vehicles: 1,
});
await ensure(
  FleetVehicle,
  { owner_id: fleetOwner._id, license_plate_number: 'MP09TF0004' },
  {
    owner_id: fleetOwner._id,
    service_location_id: location._id,
    vehicle_type_id: suvType._id,
    car_brand: 'Mahindra',
    car_model: 'XUV700',
    license_plate_number: 'MP09TF0004',
    car_color: 'Black',
    status: 'approved',
    active: true,
  },
  'fleet vehicle MP09TF0004 (SUV)',
);
await driver('9000000005', 'Test Fleet Driver', {
  owner_id: fleetOwner._id,
  vehicleType: 'car',
  vehicleTypeId: suvType._id,
  vehicleIconType: 'suv',
  vehicleMake: 'Mahindra',
  vehicleModel: 'XUV700',
  vehicleNumber: 'MP09TF0004',
  vehicleColor: 'Black',
  serviceCategories: ['taxi'],
});

// ---------- bus owner, bus and bus driver ----------
const busOwner = await owner('9000000006', {
  company_name: 'Test Bus Travels',
  name: 'Test Bus Owner',
  email: 'bus.owner@test.kailotaxi.com',
  transport_type: 'bus',
  no_of_vehicles: 1,
});
const busDriver = await ensure(
  BusDriver,
  { phone: '9000000007' },
  {
    name: 'Test Bus Driver',
    phone: '9000000007',
    email: 'bus.driver@test.kailotaxi.com',
    operatorName: 'Test Bus Travels',
    busName: 'Kailo Express',
    serviceNumber: 'KE-101',
    registrationNumber: 'MP09TB1001',
    originCity: 'Indore',
    destinationCity: 'Bhopal',
    routeName: 'Indore - Bhopal',
  },
  'bus driver 9000000007',
);
const bus = await ensure(
  BusService,
  { registrationNumber: 'MP09TB1001' },
  {
    operatorName: 'Test Bus Travels',
    busName: 'Kailo Express',
    serviceNumber: 'KE-101',
    registrationNumber: 'MP09TB1001',
    driverName: 'Test Bus Driver',
    driverPhone: '9000000007',
    busDriverId: busDriver._id,
    ownerId: busOwner._id,
    coachType: 'AC Seater',
    busCategory: 'Seater',
    seatPrice: 450,
  },
  'bus "Kailo Express" (Indore - Bhopal)',
);
if (!busDriver.assignedBusServiceId) {
  busDriver.assignedBusServiceId = bus._id;
  await busDriver.save();
}

// ---------- car pooling vehicles ----------
await ensure(
  PoolingVehicle,
  { vehicleNumber: 'MP09TP1001' },
  { name: 'Test SUV Pool', vehicleModel: 'Toyota Innova', vehicleNumber: 'MP09TP1001', color: 'White', capacity: 6, vehicleType: 'suv', baseFare: 50, pricePerKm: 14, minFare: 150 },
  'pooling vehicle "Test SUV Pool" (6 seats)',
);
await ensure(
  PoolingVehicle,
  { vehicleNumber: 'MP09TP1002' },
  { name: 'Test Sedan Pool', vehicleModel: 'Maruti Dzire', vehicleNumber: 'MP09TP1002', color: 'Silver', capacity: 4, vehicleType: 'sedan', baseFare: 40, pricePerKm: 11, minFare: 120 },
  'pooling vehicle "Test Sedan Pool" (4 seats)',
);

// ---------- parcel service ----------
for (const name of ['Documents', 'Clothes', 'Electronics', 'Food & Groceries', 'Gifts', 'Others']) {
  await ensure(
    GoodsType,
    { goods_type_name: name },
    { goods_type_name: name, name, goods_types_for: 'both', active: 1, status: 'active' },
    `goods type "${name}"`,
  );
}

// Parcel fares come from the delivery vehicle's own distance pricing.
const setDeliveryPricing = async (vehicle, pricing, label) => {
  if (vehicle.delivery_distance_pricing?.enabled) {
    created.push(`= delivery pricing for ${label} (already enabled)`);
    return;
  }
  await Vehicle.updateOne({ _id: vehicle._id }, { $set: { delivery_distance_pricing: { enabled: true, ...pricing } } });
  created.push(`+ delivery pricing for ${label}`);
};
const bikeParcelType = await Vehicle.findOne({ name: 'Bike Parcel' });
await setDeliveryPricing(bikeParcelType, { base_price: 30, free_distance: 2, distance_price: 8, free_time: 0, time_price: 0 }, 'Bike Parcel');
const truckType = await ensure(
  Vehicle,
  { name: 'Mini Truck' },
  { name: 'Mini Truck', status: 1, active: true, transport_type: 'delivery', icon_types: 'LCV', delivery_category: 'trucks', capacity: 500, short_description: 'Heavy and bulky parcels' },
  'vehicle type "Mini Truck"',
);
await setDeliveryPricing(truckType, { base_price: 120, free_distance: 2, distance_price: 18, free_time: 0, time_price: 0 }, 'Mini Truck');

// Driver 9000000001 (bike): parcel on, alongside rides.
const parcelDriverUpdate = await Driver.updateOne(
  { phone: '9000000001' },
  { $set: { registerFor: 'both', servicePreference: 'both' }, $addToSet: { serviceCategories: { $each: ['taxi', 'delivery'] } } },
);
created.push(`~ driver 9000000001 parcel service enabled (${parcelDriverUpdate.modifiedCount ? 'updated' : 'already on'})`);

await driver('9000000008', 'Test Mini Truck Driver', {
  vehicleType: 'car',
  vehicleTypeId: truckType._id,
  vehicleIconType: 'truck',
  vehicleMake: 'Tata',
  vehicleModel: 'Ace',
  vehicleNumber: 'MP09TT0008',
  vehicleColor: 'White',
  serviceCategories: ['delivery'],
  servicePreference: 'parcel',
  registerFor: 'delivery',
});

console.log(created.join('\n'));
await mongoose.disconnect();
