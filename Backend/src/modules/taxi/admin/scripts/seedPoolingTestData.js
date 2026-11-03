import mongoose from 'mongoose';
import { connectDatabase } from '../../../../config/database.js';
import { PoolingVehicle } from '../models/PoolingVehicle.js';
import { PoolingRoute } from '../models/PoolingRoute.js';
import { PoolingTrip } from '../models/PoolingTrip.js';
import { PoolingBooking } from '../models/PoolingBooking.js';
import { User } from '../../user/models/User.js';
import { UserWallet } from '../../user/models/UserWallet.js';

const seedPoolingData = async () => {
  try {
    console.log('Connecting to database...');
    await connectDatabase();
    console.log('Connected to MongoDB!');

    // 1. Ensure primary test user (upma) has wallet balance for testing bookings
    const testUser = await User.findOne({ phone: '7354126134' });
    if (testUser) {
      await UserWallet.updateOne(
        { userId: testUser._id },
        {
          $set: { balance: 5000 },
          $push: {
            transactions: {
              $each: [
                {
                  kind: 'credit',
                  amount: 5000,
                  title: 'Test Wallet Topup for Pooling',
                  provider: 'wallet',
                  referenceKey: `test_topup_${Date.now()}`,
                  createdAt: new Date(),
                },
              ],
              $slice: -50,
            },
          },
        },
        { upsert: true }
      );
      console.log(`Updated wallet for ${testUser.name} (${testUser.phone}) to ₹5000`);
    } else {
      console.log('Primary test user not found by phone 7354126134');
    }

    // 2. Ensure secondary test user (fellow rider/trip initiator) exists
    let fellowUser = await User.findOne({ phone: '9876543210' });
    if (!fellowUser) {
      fellowUser = await User.create({
        name: 'Rahul Sharma',
        phone: '9876543210',
        email: 'rahul.sharma@example.com',
        countryCode: '+91',
      });
      console.log('Created fellow test user Rahul Sharma (9876543210)');
    } else {
      console.log('Fellow test user Rahul Sharma already exists');
    }

    // 3. Find or create pooling vehicles
    let sedan = await PoolingVehicle.findOne({ vehicleNumber: 'MP09TP1002' });
    if (!sedan) {
      sedan = await PoolingVehicle.create({
        name: 'City Cruiser Sedan',
        vehicleModel: 'Maruti Suzuki Dzire',
        vehicleNumber: 'MP09TP1002',
        color: 'Silver',
        capacity: 4,
        adminCommissionPercentage: 10,
        serviceTaxPercentage: 5,
        baseFare: 40,
        pricePerKm: 11,
        minFare: 120,
        vehicleType: 'sedan',
        status: 'active',
        poolingEnabled: true,
        blueprint: {
          rows: 3,
          cols: 2,
          layout: [
            { r: 0, c: 0, type: 'driver' },
            { r: 0, c: 1, type: 'empty' },
            { r: 1, c: 0, type: 'seat' },
            { r: 1, c: 1, type: 'seat' },
            { r: 2, c: 0, type: 'seat' },
            { r: 2, c: 1, type: 'seat' },
          ],
        },
      });
      console.log('Created Sedan Pooling Vehicle:', sedan.name);
    }

    let suv = await PoolingVehicle.findOne({ vehicleNumber: 'MP09TP1001' });
    if (!suv) {
      suv = await PoolingVehicle.create({
        name: 'Comfort Plus SUV',
        vehicleModel: 'Toyota Innova Crysta',
        vehicleNumber: 'MP09TP1001',
        color: 'Pearl White',
        capacity: 6,
        adminCommissionPercentage: 12,
        serviceTaxPercentage: 5,
        baseFare: 60,
        pricePerKm: 15,
        minFare: 180,
        vehicleType: 'suv',
        status: 'active',
        poolingEnabled: true,
        blueprint: {
          rows: 4,
          cols: 2,
          layout: [
            { r: 0, c: 0, type: 'driver' },
            { r: 0, c: 1, type: 'empty' },
            { r: 1, c: 0, type: 'seat' },
            { r: 1, c: 1, type: 'seat' },
            { r: 2, c: 0, type: 'seat' },
            { r: 2, c: 1, type: 'seat' },
            { r: 3, c: 0, type: 'seat' },
            { r: 3, c: 1, type: 'seat' },
          ],
        },
      });
      console.log('Created SUV Pooling Vehicle:', suv.name);
    }

    // 4. Create Predefined Routes in TaxiPoolingRoute
    await PoolingRoute.deleteMany({ routeCode: { $in: ['IND-BHO-01', 'IND-AIR-01', 'IND-UJJ-01'] } });

    const routesToCreate = [
      {
        routeName: 'Indore to Bhopal Express Corridor',
        routeCode: 'IND-BHO-01',
        originLabel: 'Vijay Nagar, Indore, Madhya Pradesh, India',
        destinationLabel: 'MP Nagar, Bhopal, Madhya Pradesh, India',
        description: 'Popular high-frequency pooling corridor connecting Indore and Bhopal.',
        assignedVehicleTypeIds: [sedan._id, suv._id],
        pickupPoints: [
          {
            id: 'stop-ind-1',
            name: 'Vijay Nagar Square',
            address: 'Vijay Nagar, Indore',
            landmark: 'Brilliant Convention Centre',
            stopType: 'pickup',
            sequence: 1,
            etaMinutes: 0,
            latitude: 22.7533,
            longitude: 75.8937,
          },
          {
            id: 'stop-ind-2',
            name: 'Radisson Square',
            address: 'Ring Road, Indore',
            landmark: 'Radisson Blu Hotel',
            stopType: 'pickup',
            sequence: 2,
            etaMinutes: 15,
            latitude: 22.7441,
            longitude: 75.8988,
          },
          {
            id: 'stop-ind-3',
            name: 'Dewas Bypass',
            address: 'AB Road, Dewas',
            landmark: 'Flyover intersection',
            stopType: 'pickup',
            sequence: 3,
            etaMinutes: 45,
            latitude: 22.9676,
            longitude: 76.0534,
          },
        ],
        dropPoints: [
          {
            id: 'stop-bho-1',
            name: 'Lalghati Circle',
            address: 'Airport Road, Bhopal',
            landmark: 'Lalghati Chowk',
            stopType: 'drop',
            sequence: 4,
            etaMinutes: 180,
            latitude: 23.2845,
            longitude: 77.3732,
          },
          {
            id: 'stop-bho-2',
            name: 'MP Nagar Zone 1',
            address: 'MP Nagar, Bhopal',
            landmark: 'DB City Mall',
            stopType: 'drop',
            sequence: 5,
            etaMinutes: 210,
            latitude: 23.2332,
            longitude: 77.4343,
          },
        ],
        schedules: [
          {
            id: 'sch-01',
            label: 'Morning Office Express',
            departureTime: '08:00',
            arrivalTime: '11:30',
            activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            status: 'active',
          },
          {
            id: 'sch-02',
            label: 'Evening Return Shuttle',
            departureTime: '18:00',
            arrivalTime: '21:30',
            activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            status: 'active',
          },
        ],
        farePerSeat: 350,
        maxSeatsPerBooking: 4,
        maxAdvanceBookingHours: 48,
        boardingBufferMinutes: 15,
        poolingRules: {
          allowInstantBooking: true,
          allowLuggage: true,
          womenOnly: false,
          autoAssignNearestPickup: true,
          maxDetourKm: 5,
        },
        status: 'active',
        active: true,
      },
      {
        routeName: 'Vijay Nagar to Indore Airport Shuttle',
        routeCode: 'IND-AIR-01',
        originLabel: 'Vijay Nagar, Indore, Madhya Pradesh, India',
        destinationLabel: 'Devi Ahilyabai Holkar Airport, Indore, Madhya Pradesh, India',
        description: 'Airport pool shuttle connecting major tech parks and hubs directly to IDR Airport.',
        assignedVehicleTypeIds: [sedan._id, suv._id],
        pickupPoints: [
          {
            id: 'stop-air-1',
            name: 'Vijay Nagar Hub',
            address: 'Vijay Nagar, Indore',
            landmark: 'C21 Mall',
            stopType: 'pickup',
            sequence: 1,
            etaMinutes: 0,
            latitude: 22.7533,
            longitude: 75.8937,
          },
          {
            id: 'stop-air-2',
            name: 'Palasia Square',
            address: 'MG Road, Indore',
            landmark: 'Industry House',
            stopType: 'pickup',
            sequence: 2,
            etaMinutes: 15,
            latitude: 22.7244,
            longitude: 75.8839,
          },
        ],
        dropPoints: [
          {
            id: 'stop-air-drop',
            name: 'Departure Terminal Gate 1',
            address: 'Airport Road, Indore',
            landmark: 'Departures',
            stopType: 'drop',
            sequence: 3,
            etaMinutes: 45,
            latitude: 22.7218,
            longitude: 75.8011,
          },
        ],
        schedules: [
          {
            id: 'sch-air-01',
            label: 'Morning Flight Connect',
            departureTime: '06:30',
            arrivalTime: '07:15',
            activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            status: 'active',
          },
          {
            id: 'sch-air-02',
            label: 'Afternoon Flight Connect',
            departureTime: '13:30',
            arrivalTime: '14:15',
            activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            status: 'active',
          },
        ],
        farePerSeat: 150,
        maxSeatsPerBooking: 3,
        maxAdvanceBookingHours: 24,
        boardingBufferMinutes: 15,
        poolingRules: {
          allowInstantBooking: true,
          allowLuggage: true,
          womenOnly: false,
          autoAssignNearestPickup: true,
          maxDetourKm: 3,
        },
        status: 'active',
        active: true,
      },
    ];

    const insertedRoutes = await PoolingRoute.insertMany(routesToCreate);
    console.log(`Inserted ${insertedRoutes.length} predefined pooling routes!`);

    // 5. Create Active Pooling Trips (TaxiPoolingTrip)
    // Clean old test trips
    await PoolingTrip.deleteMany({ tripCode: { $in: ['PT_TEST_IND_BHO_1', 'PT_TEST_IND_BHO_2', 'PT_TEST_IND_AIR_1'] } });
    await PoolingBooking.deleteMany({ bookingId: { $in: ['POOL_TEST_BHO_1', 'POOL_TEST_BHO_2', 'POOL_TEST_AIR_1'] } });

    // Dates for testing: Today & Tomorrow
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    // Trip 1: Tomorrow 09:00 AM (Indore Vijay Nagar -> Bhopal MP Nagar) in Sedan
    // Rahul already booked 1 seat, so 3 seats remain!
    const trip1DepartureAt = new Date(`${tomorrowStr}T09:00:00+05:30`);
    const totalFareTrip1 = Math.ceil(40 + 11 * 195); // baseFare + pricePerKm * distance = 40 + 2145 = 2185
    const trip1 = await PoolingTrip.create({
      tripCode: 'PT_TEST_IND_BHO_1',
      vehicle: sedan._id,
      createdBy: fellowUser._id,
      origin: {
        label: 'Vijay Nagar, Indore, Madhya Pradesh, India',
        lat: 22.7533,
        lng: 75.8937,
      },
      destination: {
        label: 'MP Nagar, Bhopal, Madhya Pradesh, India',
        lat: 23.2332,
        lng: 77.4343,
      },
      travelDate: tomorrowStr,
      departureTime: '09:00',
      departureAt: trip1DepartureAt,
      distanceKm: 195,
      totalFare: totalFareTrip1,
      serviceTaxPercentage: 0,
      capacity: 4,
      occupiedSeats: 1,
      status: 'open',
    });

    // Booking 1 for Trip 1 (Rahul Sharma paid full car fare initially)
    await PoolingBooking.create({
      bookingId: 'POOL_TEST_BHO_1',
      user: fellowUser._id,
      trip: trip1._id,
      vehicle: sedan._id,
      departureTime: '09:00',
      seatsBooked: 1,
      fare: totalFareTrip1,
      baseFare: totalFareTrip1,
      serviceTaxPercentage: 0,
      serviceTaxAmount: 0,
      paidAmount: totalFareTrip1,
      refundedAmount: 0,
      currency: 'INR',
      paymentStatus: 'paid',
      bookingStatus: 'confirmed',
      travelDate: new Date(`${tomorrowStr}T00:00:00.000Z`),
      pickupLabel: 'Vijay Nagar, Indore, Madhya Pradesh, India',
      dropLabel: 'MP Nagar, Bhopal, Madhya Pradesh, India',
      pickupLocation: { lat: 22.7533, lng: 75.8937 },
      dropLocation: { lat: 23.2332, lng: 77.4343 },
      payment: {
        provider: 'wallet',
        orderId: 'wallet:seed_bho_01',
        paymentId: 'wallet_seed_bho_01',
        status: 'paid',
        paidAt: new Date(),
      },
    });

    // Trip 2: Tomorrow 18:00 (Indore Vijay Nagar -> Bhopal MP Nagar) in SUV
    // 2 seats already occupied, 4 seats left
    const trip2DepartureAt = new Date(`${tomorrowStr}T18:00:00+05:30`);
    const totalFareTrip2 = Math.ceil(60 + 15 * 195); // 60 + 2925 = 2985
    const trip2 = await PoolingTrip.create({
      tripCode: 'PT_TEST_IND_BHO_2',
      vehicle: suv._id,
      createdBy: fellowUser._id,
      origin: {
        label: 'Vijay Nagar, Indore, Madhya Pradesh, India',
        lat: 22.7533,
        lng: 75.8937,
      },
      destination: {
        label: 'MP Nagar, Bhopal, Madhya Pradesh, India',
        lat: 23.2332,
        lng: 77.4343,
      },
      travelDate: tomorrowStr,
      departureTime: '18:00',
      departureAt: trip2DepartureAt,
      distanceKm: 195,
      totalFare: totalFareTrip2,
      serviceTaxPercentage: 0,
      capacity: 6,
      occupiedSeats: 2,
      status: 'open',
    });

    await PoolingBooking.create({
      bookingId: 'POOL_TEST_BHO_2',
      user: fellowUser._id,
      trip: trip2._id,
      vehicle: suv._id,
      departureTime: '18:00',
      seatsBooked: 2,
      fare: totalFareTrip2,
      baseFare: totalFareTrip2,
      serviceTaxPercentage: 0,
      serviceTaxAmount: 0,
      paidAmount: totalFareTrip2,
      refundedAmount: 0,
      currency: 'INR',
      paymentStatus: 'paid',
      bookingStatus: 'confirmed',
      travelDate: new Date(`${tomorrowStr}T00:00:00.000Z`),
      pickupLabel: 'Vijay Nagar, Indore, Madhya Pradesh, India',
      dropLabel: 'MP Nagar, Bhopal, Madhya Pradesh, India',
      pickupLocation: { lat: 22.7533, lng: 75.8937 },
      dropLocation: { lat: 23.2332, lng: 77.4343 },
      payment: {
        provider: 'wallet',
        orderId: 'wallet:seed_bho_02',
        paymentId: 'wallet_seed_bho_02',
        status: 'paid',
        paidAt: new Date(),
      },
    });

    // Trip 3: Today Evening Departure (at least 3 hours from now) for immediate testing today!
    const todayLate = new Date();
    todayLate.setHours(todayLate.getHours() + 4, 0, 0, 0);
    const todayDepartureTime = `${pad(todayLate.getHours())}:00`;
    const trip3DepartureAt = new Date(`${todayStr}T${todayDepartureTime}:00+05:30`);
    const totalFareTrip3 = Math.ceil(40 + 11 * 16); // ~ 216
    const trip3 = await PoolingTrip.create({
      tripCode: 'PT_TEST_IND_AIR_1',
      vehicle: sedan._id,
      createdBy: fellowUser._id,
      origin: {
        label: 'Vijay Nagar, Indore, Madhya Pradesh, India',
        lat: 22.7533,
        lng: 75.8937,
      },
      destination: {
        label: 'Devi Ahilyabai Holkar Airport, Indore, Madhya Pradesh, India',
        lat: 22.7218,
        lng: 75.8011,
      },
      travelDate: todayStr,
      departureTime: todayDepartureTime,
      departureAt: trip3DepartureAt,
      distanceKm: 16,
      totalFare: totalFareTrip3,
      serviceTaxPercentage: 0,
      capacity: 4,
      occupiedSeats: 1,
      status: 'open',
    });

    await PoolingBooking.create({
      bookingId: 'POOL_TEST_AIR_1',
      user: fellowUser._id,
      trip: trip3._id,
      vehicle: sedan._id,
      departureTime: todayDepartureTime,
      seatsBooked: 1,
      fare: totalFareTrip3,
      baseFare: totalFareTrip3,
      serviceTaxPercentage: 0,
      serviceTaxAmount: 0,
      paidAmount: totalFareTrip3,
      refundedAmount: 0,
      currency: 'INR',
      paymentStatus: 'paid',
      bookingStatus: 'confirmed',
      travelDate: new Date(`${todayStr}T00:00:00.000Z`),
      pickupLabel: 'Vijay Nagar, Indore, Madhya Pradesh, India',
      dropLabel: 'Devi Ahilyabai Holkar Airport, Indore, Madhya Pradesh, India',
      pickupLocation: { lat: 22.7533, lng: 75.8937 },
      dropLocation: { lat: 22.7218, lng: 75.8011 },
      payment: {
        provider: 'wallet',
        orderId: 'wallet:seed_air_01',
        paymentId: 'wallet_seed_air_01',
        status: 'paid',
        paidAt: new Date(),
      },
    });

    console.log(`Successfully created 3 live testing trips for ${todayStr} and ${tomorrowStr}!`);
    console.log('--- TEST DATA SEEDING COMPLETED ---');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding pooling data:', error);
    process.exit(1);
  }
};

seedPoolingData();
