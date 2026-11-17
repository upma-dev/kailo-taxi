// Seeds a complete demo for the bus flow so every screen can be checked:
// a fleet Owner -> a live Bus (route, stops, 2 trips, 40-seat layout) -> the Test Bus Driver -> passengers.
// Safe to run again: it updates the same records instead of creating duplicates.
//
//   node scripts/seedBusDemo.js
//
// Logins afterwards (OTP 1234 for the test numbers in staticOtpService):
//   Owner tab      9000000006
//   Bus tab        9000000007   (Test Bus Driver)
import 'dotenv/config';
import mongoose from 'mongoose';
import { Owner } from '../src/modules/taxi/admin/models/Owner.js';
import { BusService } from '../src/modules/taxi/admin/models/BusService.js';
import { BusDriver } from '../src/modules/taxi/driver/models/BusDriver.js';
import { BusBooking } from '../src/modules/taxi/user/models/BusBooking.js';
import { User } from '../src/modules/taxi/user/models/User.js';
import { BusSeatHold } from '../src/modules/taxi/user/models/BusSeatHold.js';
import { TripSeatInventory } from '../src/modules/taxi/user/models/TripSeatInventory.js';
import { ensureTripInstance } from '../src/modules/taxi/services/tripGeneratorService.js';

const OWNER_PHONE = '9000000006';
const OWNER_EMAIL = 'bus.owner@test.kailotaxi.com';
const DRIVER_PHONE = '9000000007';
const REG_NO = 'MP09TB1001';
const SEAT_PRICE = 450;
const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

await mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 20000,
  dbName: process.env.MONGODB_DB_NAME || undefined,
});

// ---- Owner -------------------------------------------------------------------------------------------
let owner = await Owner.findOne({ $or: [{ mobile: OWNER_PHONE }, { phone: OWNER_PHONE }, { email: OWNER_EMAIL }] });
if (!owner) owner = new Owner({ mobile: OWNER_PHONE, phone: OWNER_PHONE });
Object.assign(owner, {
  company_name: 'Test Bus Travels',
  name: 'Test Bus Owner',
  owner_name: 'Test Bus Owner',
  email: OWNER_EMAIL,
  city: 'Indore',
  active: true,
  approve: true,
  status: 'approved',
});
await owner.save();

// ---- Seat layout: 10 rows x (2 + aisle + 2) = 40 seats -----------------------------------------------
const blueprintRows = Array.from({ length: 10 }, (_, i) => {
  const row = i + 1;
  const seat = (code, variant) => ({ kind: 'seat', id: `${row}${code}`, label: `${row}${code}`, variant, status: 'available' });
  return [
    seat('A', 'window'),
    seat('B', 'aisle'),
    { kind: 'aisle', id: '', label: '', variant: 'seat', status: 'available' },
    seat('C', 'aisle'),
    seat('D', 'window'),
  ];
});

// ---- Bus ---------------------------------------------------------------------------------------------
let bus = await BusService.findOne({ registrationNumber: REG_NO });
if (!bus) bus = new BusService();
Object.assign(bus, {
  ownerId: owner._id,
  operatorName: 'Test Bus Travels',
  busName: 'Kailo Express',
  serviceNumber: 'KE-101',
  registrationNumber: REG_NO,
  coachType: 'AC Seater',
  busCategory: 'Seater',
  seatPrice: SEAT_PRICE,
  variantPricing: { seat: SEAT_PRICE, window: 500, aisle: SEAT_PRICE, sleeper: SEAT_PRICE },
  fareCurrency: 'INR',
  amenities: ['AC', 'Charging point', 'Water bottle', 'Reclining seats'],
  capacity: 40,
  status: 'active',
  rejectionReason: '',
  blueprint: { templateKey: 'seater_2_2', lowerDeck: blueprintRows, upperDeck: [] },
  route: {
    routeName: 'Indore - Bhopal Express',
    originCity: 'Indore',
    destinationCity: 'Bhopal',
    distanceKm: '195',
    durationHours: '4',
    stops: [
      { id: 'stop-1', city: 'Indore', pointName: 'Vijay Nagar Square', stopType: 'pickup', arrivalTime: '', departureTime: '06:30 AM' },
      { id: 'stop-2', city: 'Dewas', pointName: 'Bypass Chauraha', stopType: 'both', arrivalTime: '07:15 AM', departureTime: '07:20 AM' },
      { id: 'stop-3', city: 'Sehore', pointName: 'Bus Stand', stopType: 'both', arrivalTime: '09:00 AM', departureTime: '09:05 AM' },
      { id: 'stop-4', city: 'Bhopal', pointName: 'ISBT Bhopal', stopType: 'drop', arrivalTime: '10:30 AM', departureTime: '' },
    ],
  },
  schedules: [
    { id: 'schedule-morning', label: 'Morning Express', departureTime: '06:30 AM', arrivalTime: '10:30 AM', activeDays: ALL_DAYS, status: 'active' },
    { id: 'schedule-evening', label: 'Evening Express', departureTime: '05:00 PM', arrivalTime: '09:00 PM', activeDays: ALL_DAYS, status: 'active' },
  ],
  cancellationRules: [
    { id: 'rule-1', label: 'More than 12 hours before', hoursBeforeDeparture: 12, refundType: 'percentage', refundValue: 90, notes: '' },
    { id: 'rule-2', label: '4 to 12 hours before', hoursBeforeDeparture: 4, refundType: 'percentage', refundValue: 50, notes: '' },
  ],
});

// Trips created earlier keep the price they were created with, so refresh the still-free seats.
for (const [seatType, price] of Object.entries(bus.variantPricing.toObject ? bus.variantPricing.toObject() : bus.variantPricing)) {
  await TripSeatInventory.updateMany(
    { busServiceId: bus._id, seatType, status: 'available' },
    { $set: { price: Number(price) } },
  );
}

// ---- Driver, linked to the bus -----------------------------------------------------------------------
let driver = await BusDriver.findOne({ phone: DRIVER_PHONE });
if (!driver) driver = new BusDriver({ phone: DRIVER_PHONE, name: 'Test Bus Driver' });
Object.assign(driver, {
  approve: true,
  active: true,
  status: 'approved',
  assignedBusServiceId: bus._id,
  operatorName: bus.operatorName,
  busName: bus.busName,
  serviceNumber: bus.serviceNumber,
  registrationNumber: bus.registrationNumber,
  routeName: bus.route.routeName,
  originCity: bus.route.originCity,
  destinationCity: bus.route.destinationCity,
});
await driver.save();

bus.driverName = driver.name;
bus.driverPhone = driver.phone;
bus.busDriverId = driver._id;
await bus.save();

// ---- Passengers: a few app users + one desk booking ---------------------------------------------------
const toKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = toKey(new Date());
const tomorrow = toKey(new Date(Date.now() + 86400000));

let users = await User.find({}).sort({ createdAt: 1 }).limit(3);
if (users.length === 0) {
  users = [await User.create({ name: 'Demo Passenger', phone: '9000000099', email: 'demo.passenger@test.kailotaxi.com' })];
}
const pickUser = (i) => users[i % users.length];

const demoBookings = [
  { code: 'DEMO-BUS-001', user: pickUser(0), name: 'Rohit Sharma', phone: '9811100001', age: 29, gender: 'male', seats: ['1A', '1B'], date: today, schedule: 'schedule-morning', source: 'user' },
  { code: 'DEMO-BUS-002', user: pickUser(1), name: 'Priya Verma', phone: '9811100002', age: 26, gender: 'female', seats: ['4D'], date: today, schedule: 'schedule-morning', source: 'user' },
  { code: 'DEMO-BUS-003', user: pickUser(2), name: 'Amit Patel', phone: '9811100003', age: 41, gender: 'male', seats: ['7A'], date: today, schedule: 'schedule-morning', source: 'bus_driver' },
  { code: 'DEMO-BUS-004', user: pickUser(0), name: 'Sneha Joshi', phone: '9811100004', age: 33, gender: 'female', seats: ['2C', '2D'], date: tomorrow, schedule: 'schedule-evening', source: 'user' },
];

// Start clean so re-running never leaves seats locked by an old demo booking.
const oldDemo = await BusBooking.find({ bookingCode: /^DEMO-BUS-/ }).select('_id');
if (oldDemo.length) {
  const ids = oldDemo.map((x) => x._id);
  await TripSeatInventory.updateMany(
    { bookingId: { $in: ids } },
    { $set: { status: 'available', bookingId: null, holdId: null, holdExpiresAt: null, bookedBy: {} } },
  );
  await BusSeatHold.deleteMany({ bookingId: { $in: ids } });
  await BusBooking.deleteMany({ _id: { $in: ids } });
}

// Seats freed by the clean-up above may still hold an old price: refresh again.
for (const [seatType, price] of Object.entries({ seat: SEAT_PRICE, window: 500, aisle: SEAT_PRICE, sleeper: SEAT_PRICE })) {
  await TripSeatInventory.updateMany(
    { busServiceId: bus._id, seatType, status: 'available' },
    { $set: { price: Number(price) } },
  );
}

for (const b of demoBookings) {
  const schedule = bus.schedules.find((s) => s.id === b.schedule);
  const trip = await ensureTripInstance({ busService: bus.toObject(), scheduleId: b.schedule, travelDate: b.date });
  const bookingId = new mongoose.Types.ObjectId();

  const locked = [];
  for (const seatId of b.seats) {
    const doc = await TripSeatInventory.findOneAndUpdate(
      { tripId: trip._id, seatId, status: 'available' },
      {
        $set: {
          status: 'booked',
          bookingId,
          holdExpiresAt: null,
          bookedBy: b.source === 'bus_driver' ? { driverId: driver._id, bookingSource: 'bus_driver' } : { userId: b.user._id, bookingSource: 'user' },
        },
      },
      { new: true },
    );
    if (!doc) throw new Error(`Seat ${seatId} on ${b.date} ${b.schedule} is not available`);
    locked.push(doc);
  }

  const amount = locked.reduce((sum, doc) => sum + Number(doc.price || SEAT_PRICE), 0);
  const booking = await BusBooking.create({
    _id: bookingId,
    userId: b.source === 'bus_driver' ? driver._id : b.user._id,
    tripId: trip._id,
    busServiceId: bus._id,
    bookingCode: b.code,
    scheduleId: b.schedule,
    travelDate: b.date,
    seatIds: b.seats,
    seatLabels: b.seats,
    passenger: { name: b.name, age: b.age, gender: b.gender, phone: b.phone, email: '' },
    amount,
    currency: 'INR',
    bookingSource: b.source,
    reservedByDriverId: b.source === 'bus_driver' ? driver._id : null,
    status: 'confirmed',
    routeSnapshot: {
      originCity: bus.route.originCity,
      destinationCity: bus.route.destinationCity,
      departureTime: schedule?.departureTime || '',
      arrivalTime: schedule?.arrivalTime || '',
      durationHours: bus.route.durationHours,
      busName: bus.busName,
      operatorName: bus.operatorName,
      coachType: bus.coachType,
      busCategory: bus.busCategory,
      registrationNumber: bus.registrationNumber,
      driverName: driver.name,
      driverPhone: driver.phone,
    },
    busSnapshot: trip.busSnapshot || {},
    blueprintSnapshot: trip.blueprintSnapshot || {},
    payment:
      b.source === 'bus_driver'
        ? { provider: 'manual', status: 'manual_reserved', paidAt: new Date() }
        : { provider: 'razorpay', status: 'paid', paidAt: new Date() },
    financialSnapshot: { baseFare: amount, totalPaidAmount: amount },
  });

  await BusSeatHold.create({
    tripId: trip._id,
    busServiceId: bus._id,
    bookingId: booking._id,
    userId: b.source === 'bus_driver' ? null : b.user._id,
    driverId: b.source === 'bus_driver' ? driver._id : null,
    scheduleId: b.schedule,
    travelDate: b.date,
    seatId: b.seats[0],
    seatIds: b.seats,
    holdToken: b.code,
    status: 'converted',
    expiresAt: null,
  });
}

console.log('Bus demo seeded.');
console.log(`  Owner  : ${owner.name} (${owner.mobile || owner.phone})`);
console.log(`  Bus    : ${bus.busName} ${bus.registrationNumber}, ${bus.route.originCity} -> ${bus.route.destinationCity}, 40 seats, 2 trips`);
console.log(`  Driver : ${driver.name} (${DRIVER_PHONE})`);
console.log(`  Bookings: ${demoBookings.length} (today ${today}, tomorrow ${tomorrow})`);
await mongoose.disconnect();
