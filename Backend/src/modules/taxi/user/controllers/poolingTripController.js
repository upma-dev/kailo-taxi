import crypto from 'node:crypto';
import { PoolingTrip } from '../../admin/models/PoolingTrip.js';
import { PoolingVehicle } from '../../admin/models/PoolingVehicle.js';
import { PoolingBooking } from '../../admin/models/PoolingBooking.js';
import { UserWallet } from '../models/UserWallet.js';
import { asyncHandler } from '../../../../utils/asyncHandler.js';
import { ApiError } from '../../../../utils/ApiError.js';
import { resolveConfiguredGatewayCredentials } from '../../services/paymentGatewayService.js';

/*
 * Car pooling = one car, one fare, split between everyone on board.
 *
 *  - The first rider creates a trip (A -> B at a time) and pays the whole car fare.
 *  - Anyone whose pickup/drop/time match the trip can join. Fare per seat becomes
 *    totalFare / occupiedSeats, so every earlier rider's share drops and the difference
 *    is credited to their wallet immediately (see reconcileTripShares).
 *  - Riders going somewhere else (or the opposite way) get a friendly 422 with a `code`.
 */

const ok = (res, data, message) => res.status(200).json({ success: true, data, message });
const created = (res, data, message) => res.status(201).json({ success: true, data, message });

const numberFromEnv = (name, fallback) => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const MATCH_RADIUS_KM = numberFromEnv('POOLING_MATCH_RADIUS_KM', 3);
const TIME_WINDOW_MINUTES = numberFromEnv('POOLING_TIME_WINDOW_MINUTES', 30);
const BOOKING_CUTOFF_MINUTES = numberFromEnv('POOLING_BOOKING_CUTOFF_MINUTES', 15);
const DEFAULT_PRICE_PER_KM = numberFromEnv('POOLING_DEFAULT_PRICE_PER_KM', 12);
const MIN_TRIP_DISTANCE_KM = 0.5;
const ROAD_DISTANCE_FACTOR = 1.3;
const AVERAGE_SPEED_KMPH = 35;
const MAX_SEATS_PER_BOOKING = 4;

const toCleanString = (value) => String(value ?? '').trim();
const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;
const getCurrentUserId = (req) => String(req.auth?.sub || req.user?._id || '').trim();

// ---------------------------------------------------------------- errors

const poolingError = (statusCode, code, message) => new ApiError(statusCode, message, { code });

const shortPlace = (label = '') => toCleanString(label).split(',')[0] || 'your location';

// ---------------------------------------------------------------- geo / time

const toRadians = (degree) => (degree * Math.PI) / 180;

const haversineKm = (a, b) => {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const parsePoint = (raw, fieldName) => {
  const lat = Number(raw?.lat);
  const lng = Number(raw?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw poolingError(400, 'INVALID_LOCATION', `Please choose a valid ${fieldName} location.`);
  }
  return { label: toCleanString(raw?.label), lat, lng };
};

const normalizeTravelDate = (value) => {
  const rawValue = toCleanString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    throw poolingError(400, 'INVALID_DATE', 'Please choose a valid travel date.');
  }
  return rawValue;
};

const normalizeDepartureTime = (value) => {
  const rawValue = toCleanString(value);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(rawValue)) {
    throw poolingError(400, 'INVALID_TIME', 'Please choose a valid departure time.');
  }
  return rawValue;
};

// App operates in India, so departure times are interpreted as IST.
const buildDepartureAt = (travelDate, departureTime) => new Date(`${travelDate}T${departureTime}:00+05:30`);

const parseSeats = (value, max = MAX_SEATS_PER_BOOKING) => {
  const seats = Math.floor(Number(value ?? 1));
  if (!Number.isFinite(seats) || seats < 1) {
    throw poolingError(400, 'INVALID_SEATS', 'Please select at least one seat.');
  }
  if (seats > max) {
    throw poolingError(400, 'TOO_MANY_SEATS', `You can book up to ${max} seats at a time.`);
  }
  return seats;
};

const getBookingCutoff = () => new Date(Date.now() + BOOKING_CUTOFF_MINUTES * 60 * 1000);

const formatTime12h = (time = '') => {
  const [hh, mm] = String(time).split(':').map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return time;
  const suffix = hh >= 12 ? 'PM' : 'AM';
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${suffix}`;
};

// ---------------------------------------------------------------- fare

const getVehicleCapacity = (vehicle = {}) => {
  const layout = Array.isArray(vehicle?.blueprint?.layout) ? vehicle.blueprint.layout : [];
  const seatCount = layout.filter((item) => item?.type === 'seat').length;
  return seatCount > 0 ? seatCount : Math.max(1, Number(vehicle?.capacity || 1));
};

const computeTotalCarFare = (vehicle, distanceKm) => {
  const pricePerKm = Number(vehicle?.pricePerKm || 0) > 0 ? Number(vehicle.pricePerKm) : DEFAULT_PRICE_PER_KM;
  const raw = Number(vehicle?.baseFare || 0) + pricePerKm * distanceKm;
  return Math.ceil(Math.max(Number(vehicle?.minFare || 0), raw));
};

/** What a rider holding `seats` of `occupiedSeats` owes for the car. */
const computeShare = ({ totalFare, serviceTaxPercentage }, seats, occupiedSeats) => {
  const totalPaise = Math.round(Number(totalFare || 0) * 100);
  const baseFare = Math.floor((totalPaise * seats) / Math.max(1, occupiedSeats)) / 100;
  const serviceTaxAmount = round2((baseFare * Number(serviceTaxPercentage || 0)) / 100);
  return {
    baseFare,
    serviceTaxPercentage: Number(serviceTaxPercentage || 0),
    serviceTaxAmount,
    totalFare: round2(baseFare + serviceTaxAmount),
  };
};

const estimateTripMinutes = (distanceKm) => Math.max(60, (distanceKm / AVERAGE_SPEED_KMPH) * 60) + 30;

// ---------------------------------------------------------------- matching

const toTripPoint = (point) => ({ lat: Number(point?.lat), lng: Number(point?.lng) });

/**
 * Returns { match: true } when the rider can share this car, otherwise the reason
 * (with a message that is safe to show to the user as-is).
 */
const classifyTripForRider = (trip, { pickup, drop, departureAt }) => {
  const origin = toTripPoint(trip.origin);
  const destination = toTripPoint(trip.destination);
  const tripRoute = `${shortPlace(trip.origin.label)} → ${shortPlace(trip.destination.label)}`;

  const sameDirection =
    haversineKm(pickup, origin) <= MATCH_RADIUS_KM && haversineKm(drop, destination) <= MATCH_RADIUS_KM;

  if (sameDirection) {
    const gapMinutes = Math.abs(departureAt.getTime() - new Date(trip.departureAt).getTime()) / 60000;
    if (gapMinutes > TIME_WINDOW_MINUTES) {
      return {
        match: false,
        code: 'TIME_MISMATCH',
        message: `This car is on your route but leaves at ${formatTime12h(trip.departureTime)}. Pick a ride within ${TIME_WINDOW_MINUTES} minutes of your time, or start a new one.`,
      };
    }
    return { match: true };
  }

  const oppositeDirection =
    haversineKm(pickup, destination) <= MATCH_RADIUS_KM && haversineKm(drop, origin) <= MATCH_RADIUS_KM;

  if (oppositeDirection) {
    return {
      match: false,
      code: 'OPPOSITE_DIRECTION',
      message: `This car is heading ${tripRoute}, which is the opposite way to your trip. You can't join it, but you can start your own ride for ${shortPlace(pickup.label)} → ${shortPlace(drop.label)}.`,
    };
  }

  return {
    match: false,
    code: 'ROUTE_MISMATCH',
    message: `This car is going ${tripRoute}, which doesn't match your pickup and drop. Choose a ride on your route or start a new one.`,
  };
};

const assertTripJoinable = async (trip, { userId, seats, pickup, drop, departureAt }) => {
  if (!trip || trip.status !== 'open') {
    throw poolingError(404, 'TRIP_UNAVAILABLE', 'This ride is no longer available.');
  }

  if (new Date(trip.departureAt) <= getBookingCutoff()) {
    throw poolingError(
      409,
      'BOOKING_CLOSED',
      `Booking for this ride is closed. It closes ${BOOKING_CUTOFF_MINUTES} minutes before departure.`,
    );
  }

  const existing = await PoolingBooking.exists({ trip: trip._id, user: userId, bookingStatus: 'confirmed' });
  if (existing) {
    throw poolingError(409, 'ALREADY_JOINED', "You're already on this ride.");
  }

  const verdict = classifyTripForRider(trip, { pickup, drop, departureAt });
  if (!verdict.match) {
    throw poolingError(422, verdict.code, verdict.message);
  }

  const seatsLeft = Number(trip.capacity) - Number(trip.occupiedSeats);
  if (seatsLeft <= 0) {
    throw poolingError(409, 'TRIP_FULL', 'This car is already full. Please pick another ride.');
  }
  if (seats > seatsLeft) {
    throw poolingError(
      409,
      'NOT_ENOUGH_SEATS',
      `Only ${seatsLeft} seat${seatsLeft === 1 ? ' is' : 's are'} left in this car.`,
    );
  }
};

const isVehicleBusy = async (vehicleId, departureAt, distanceKm) => {
  const duration = estimateTripMinutes(distanceKm) * 60 * 1000;
  const lookaround = Math.max(duration, 3 * 60 * 60 * 1000);
  const neighbours = await PoolingTrip.find({
    vehicle: vehicleId,
    status: 'open',
    departureAt: {
      $gte: new Date(departureAt.getTime() - lookaround),
      $lte: new Date(departureAt.getTime() + lookaround),
    },
  })
    .select('departureAt distanceKm')
    .lean();

  return neighbours.some((other) => {
    const gap = Math.abs(new Date(other.departureAt).getTime() - departureAt.getTime());
    return gap < Math.max(duration, estimateTripMinutes(other.distanceKm) * 60 * 1000);
  });
};

// ---------------------------------------------------------------- wallet

const creditUserWallet = async ({ userId, amount, title, referenceKey }) => {
  const credit = round2(amount);
  if (!userId || credit <= 0) return false;

  await UserWallet.updateOne(
    { userId },
    { $setOnInsert: { userId, balance: 0, refundWallet: 0, transactions: [] } },
    { upsert: true },
  );

  if (referenceKey) {
    const already = await UserWallet.exists({ userId, 'transactions.referenceKey': referenceKey });
    if (already) return false;
  }

  await UserWallet.updateOne(
    { userId },
    {
      $inc: { balance: credit },
      $push: {
        transactions: {
          $each: [{ kind: 'credit', amount: credit, title, provider: 'pooling', referenceKey: referenceKey || '' }],
          $slice: -50,
        },
      },
    },
  );
  return true;
};

const debitUserWallet = async ({ userId, amount, title, referenceKey }) => {
  const debit = round2(amount);
  const result = await UserWallet.updateOne(
    { userId, balance: { $gte: debit } },
    {
      $inc: { balance: -debit },
      $push: {
        transactions: {
          $each: [{ kind: 'debit', amount: debit, title, provider: 'pooling', referenceKey: referenceKey || '' }],
          $slice: -50,
        },
      },
    },
  );
  return result.modifiedCount === 1;
};

const getWalletBalance = async (userId) => {
  const wallet = await UserWallet.findOne({ userId }).select('balance').lean();
  return round2(wallet?.balance || 0);
};

// ---------------------------------------------------------------- razorpay

const razorpayRequest = async ({ method, path, body, keyId, keySecret }) => {
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status || 502, payload?.error?.description || payload?.error?.message || 'Razorpay request failed');
  }
  return payload;
};

// ---------------------------------------------------------------- core: request -> plan

/**
 * Validates a create/join request against current state and works out what the rider owes
 * right now. Nothing is written here, so it is safe to call for quotes and again at verify.
 */
const planBooking = async ({ userId, body }) => {
  const tripId = toCleanString(body?.tripId);
  const pickup = parsePoint(body?.pickup, 'pickup');
  const drop = parsePoint(body?.drop, 'drop');
  const travelDate = normalizeTravelDate(body?.travelDate || body?.date);
  const departureTime = normalizeDepartureTime(body?.departureTime || body?.time);
  const departureAt = buildDepartureAt(travelDate, departureTime);
  const seats = parseSeats(body?.seats);

  if (Number.isNaN(departureAt.getTime())) {
    throw poolingError(400, 'INVALID_TIME', 'Please choose a valid departure time.');
  }
  if (departureAt <= getBookingCutoff()) {
    throw poolingError(
      400,
      'DEPARTURE_TOO_SOON',
      `Please choose a departure at least ${BOOKING_CUTOFF_MINUTES} minutes from now.`,
    );
  }

  if (tripId) {
    const trip = await PoolingTrip.findById(tripId).populate('vehicle').lean();
    await assertTripJoinable(trip, { userId, seats, pickup, drop, departureAt });

    const share = computeShare(trip, seats, trip.occupiedSeats + seats);
    return { mode: 'join', trip, vehicle: trip.vehicle, pickup, drop, travelDate, departureTime, departureAt, seats, share };
  }

  const vehicleId = toCleanString(body?.vehicleId);
  const vehicle = vehicleId ? await PoolingVehicle.findById(vehicleId).lean() : null;
  if (!vehicle || vehicle.status !== 'active' || vehicle.poolingEnabled === false) {
    throw poolingError(404, 'VEHICLE_UNAVAILABLE', 'This car is not available for pooling right now.');
  }

  const distanceKm = round2(haversineKm(pickup, drop) * ROAD_DISTANCE_FACTOR);
  if (distanceKm < MIN_TRIP_DISTANCE_KM) {
    throw poolingError(400, 'TRIP_TOO_SHORT', 'Pickup and drop are too close together. Please choose different locations.');
  }

  const capacity = getVehicleCapacity(vehicle);
  if (seats > capacity) {
    throw poolingError(400, 'TOO_MANY_SEATS', `This car has only ${capacity} seats.`);
  }

  if (await isVehicleBusy(vehicle._id, departureAt, distanceKm)) {
    throw poolingError(409, 'VEHICLE_BUSY', 'This car is already booked around that time. Please pick another car or time.');
  }

  const totalFare = computeTotalCarFare(vehicle, distanceKm);
  const tripDraft = { totalFare, serviceTaxPercentage: vehicle.serviceTaxPercentage };
  const share = computeShare(tripDraft, seats, seats);

  return {
    mode: 'create',
    trip: null,
    vehicle,
    pickup,
    drop,
    travelDate,
    departureTime,
    departureAt,
    seats,
    distanceKm,
    capacity,
    totalFare,
    share,
  };
};

// ---------------------------------------------------------------- core: shares

/**
 * Re-prices every confirmed rider on the trip after the occupancy changed and credits
 * the difference to their wallet. Idempotent and safe under concurrent joins: each
 * booking is lowered with a compare-and-set on its current fare, and the wallet
 * credit only happens for the writer that won it.
 */
const reconcileTripShares = async (tripId) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const trip = await PoolingTrip.findById(tripId).lean();
    if (!trip) return;

    const bookings = await PoolingBooking.find({ trip: tripId, bookingStatus: 'confirmed' }).lean();
    let changed = false;

    for (const booking of bookings) {
      const target = computeShare(trip, booking.seatsBooked, trip.occupiedSeats);
      const current = round2(booking.fare);
      const refund = round2(current - target.totalFare);
      if (refund <= 0) continue;

      const updated = await PoolingBooking.updateOne(
        { _id: booking._id, fare: booking.fare },
        {
          $set: {
            fare: target.totalFare,
            baseFare: target.baseFare,
            serviceTaxAmount: target.serviceTaxAmount,
          },
          $inc: { refundedAmount: refund },
        },
      );

      if (updated.modifiedCount === 1) {
        changed = true;
        await creditUserWallet({
          userId: booking.user,
          amount: refund,
          title: `Pool ride refund ₹${refund} - ${shortPlace(trip.origin.label)} → ${shortPlace(trip.destination.label)}`,
          referenceKey: `pool-split:${booking._id}:${target.totalFare}`,
        });
      }
    }

    if (!changed) return;
  }
};

const createTripCode = () =>
  `PT${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
const createBookingCode = () =>
  `POOL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

/**
 * Writes the booking after money has been collected. If anything goes wrong the whole
 * `paidAmount` goes back to the rider's wallet, so a failure never swallows a payment.
 */
const finalizeBooking = async ({ userId, body, paidAmount, payment }) => {
  const paymentKey = payment.paymentId || payment.orderId;
  const populateVehicle = (query) => query.populate('vehicle', 'name vehicleNumber vehicleModel images').lean();

  // Concurrent duplicate of a payment that already produced a booking: hand that booking back, never refund it.
  const findBookingForPayment = () => populateVehicle(PoolingBooking.findOne({ user: userId, 'payment.paymentId': payment.paymentId }));

  const failAndReturnPayment = async (error, reason) => {
    const duplicate = await findBookingForPayment();
    if (duplicate) return duplicate;

    await creditUserWallet({
      userId,
      amount: paidAmount,
      title: `Pool ride payment returned - ${reason}`,
      referenceKey: `pool-return:${paymentKey}`,
    });
    if (error instanceof ApiError && error.details?.code) {
      error.message = `${error.message} Your ₹${paidAmount} has been added to your wallet.`;
    }
    throw error;
  };

  let plan;
  try {
    plan = await planBooking({ userId, body });
  } catch (error) {
    return failAndReturnPayment(error, 'ride unavailable');
  }

  const { seats, vehicle } = plan;
  let trip;
  let reserved = false;
  let booking;
  let share;

  try {
    if (plan.mode === 'create') {
      trip = await PoolingTrip.create({
        tripCode: createTripCode(),
        vehicle: vehicle._id,
        createdBy: userId,
        origin: plan.pickup,
        destination: plan.drop,
        travelDate: plan.travelDate,
        departureTime: plan.departureTime,
        departureAt: plan.departureAt,
        distanceKm: plan.distanceKm,
        totalFare: plan.totalFare,
        serviceTaxPercentage: Number(vehicle.serviceTaxPercentage || 0),
        capacity: plan.capacity,
        occupiedSeats: seats,
      });
    } else {
      trip = await PoolingTrip.findOneAndUpdate(
        {
          _id: plan.trip._id,
          status: 'open',
          $expr: { $lte: [{ $add: ['$occupiedSeats', seats] }, '$capacity'] },
        },
        { $inc: { occupiedSeats: seats } },
        { new: true },
      ).lean();

      if (!trip) {
        throw poolingError(409, 'TRIP_FULL', 'Someone just took the last seat in this car.');
      }
    }
    reserved = true;

    // Price at the occupancy this rider actually landed on (other riders may have joined meanwhile).
    share = computeShare(trip, seats, trip.occupiedSeats);
    if (share.totalFare > round2(paidAmount)) {
      throw poolingError(409, 'FARE_CHANGED', 'The fare changed while you were paying. Please try again.');
    }

    booking = await PoolingBooking.create({
      bookingId: createBookingCode(),
      user: userId,
      trip: trip._id,
      vehicle: vehicle._id,
      departureTime: trip.departureTime,
      seatsBooked: seats,
      fare: share.totalFare,
      baseFare: share.baseFare,
      serviceTaxPercentage: share.serviceTaxPercentage,
      serviceTaxAmount: share.serviceTaxAmount,
      paidAmount: round2(paidAmount),
      refundedAmount: 0,
      currency: 'INR',
      paymentStatus: 'paid',
      bookingStatus: 'confirmed',
      travelDate: new Date(`${trip.travelDate}T00:00:00.000Z`),
      pickupLabel: plan.pickup.label,
      dropLabel: plan.drop.label,
      pickupLocation: { lat: plan.pickup.lat, lng: plan.pickup.lng },
      dropLocation: { lat: plan.drop.lat, lng: plan.drop.lng },
      payment: { ...payment, status: 'paid', paidAt: new Date() },
    });
  } catch (error) {
    // Nothing was booked: release the seats and give the money back.
    if (reserved && plan.mode === 'join') {
      await PoolingTrip.updateOne({ _id: trip._id }, { $inc: { occupiedSeats: -seats } });
    }
    if (reserved && plan.mode === 'create') {
      await PoolingTrip.deleteOne({ _id: trip._id });
    }
    return failAndReturnPayment(error, 'booking could not be completed');
  }

  // The booking now exists. Anything below must not undo it; a failure here is logged and
  // reconcileTripShares can simply be re-run.
  try {
    // Rider paid more than their final share (e.g. two people joined at once): hand back the rest.
    const excess = round2(paidAmount - share.totalFare);
    if (excess > 0) {
      await PoolingBooking.updateOne({ _id: booking._id }, { $inc: { refundedAmount: excess } });
      await creditUserWallet({
        userId,
        amount: excess,
        title: `Pool ride fare adjustment ₹${excess}`,
        referenceKey: `pool-excess:${booking._id}`,
      });
    }

    if (plan.mode === 'join') {
      await reconcileTripShares(trip._id);
    }
  } catch (error) {
    console.error('[pooling] post-booking settlement failed', booking._id, error);
  }

  return populateVehicle(PoolingBooking.findById(booking._id));
};

// ---------------------------------------------------------------- serializers

const serializeTrip = (trip, rider = null) => {
  const vehicle = trip.vehicle || {};
  const seatsLeft = Math.max(0, Number(trip.capacity) - Number(trip.occupiedSeats));
  const seats = rider?.seats || 1;
  const quote = seatsLeft >= seats ? computeShare(trip, seats, trip.occupiedSeats + seats) : null;

  return {
    _id: trip._id,
    tripCode: trip.tripCode,
    origin: trip.origin,
    destination: trip.destination,
    travelDate: trip.travelDate,
    departureTime: trip.departureTime,
    distanceKm: trip.distanceKm,
    capacity: trip.capacity,
    occupiedSeats: trip.occupiedSeats,
    seatsLeft,
    totalCarFare: trip.totalFare,
    vehicle: {
      _id: vehicle._id,
      name: vehicle.name,
      vehicleModel: vehicle.vehicleModel,
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      images: vehicle.images || [],
    },
    // Per-seat price now vs after this rider joins (what the existing riders will pay too).
    currentFarePerSeat: trip.occupiedSeats > 0 ? computeShare(trip, 1, trip.occupiedSeats).totalFare : trip.totalFare,
    youPay: quote ? quote.totalFare : null,
    farePerSeatAfterJoin: quote ? computeShare(trip, 1, trip.occupiedSeats + seats).totalFare : null,
  };
};

const serializeBooking = (booking) => {
  const vehicle = booking?.vehicle || {};
  return {
    _id: booking._id,
    bookingId: booking.bookingId,
    trip: booking.trip,
    vehicle: vehicle?._id ? vehicle : undefined,
    departureTime: booking.departureTime || '',
    pickupLabel: booking.pickupLabel || '',
    dropLabel: booking.dropLabel || '',
    seatsBooked: Number(booking.seatsBooked || 0),
    fare: Number(booking.fare || 0),
    baseFare: Number(booking.baseFare || 0),
    serviceTaxPercentage: Number(booking.serviceTaxPercentage || 0),
    serviceTaxAmount: Number(booking.serviceTaxAmount || 0),
    paidAmount: Number(booking.paidAmount || 0),
    refundedAmount: Number(booking.refundedAmount || 0),
    currency: booking.currency || 'INR',
    paymentStatus: booking.paymentStatus || 'pending',
    bookingStatus: booking.bookingStatus || 'confirmed',
    travelDate: booking.travelDate || '',
    createdAt: booking.createdAt || null,
    updatedAt: booking.updatedAt || null,
  };
};

// ---------------------------------------------------------------- handlers

export const searchPoolingTrips = asyncHandler(async (req, res) => {
  const userId = getCurrentUserId(req);
  const pickup = parsePoint(
    { lat: req.query.pickupLat, lng: req.query.pickupLng, label: req.query.pickupLabel },
    'pickup',
  );
  const drop = parsePoint({ lat: req.query.dropLat, lng: req.query.dropLng, label: req.query.dropLabel }, 'drop');
  const travelDate = normalizeTravelDate(req.query.date);
  const departureTime = normalizeDepartureTime(req.query.time);
  const departureAt = buildDepartureAt(travelDate, departureTime);
  const seats = parseSeats(req.query.seats);

  if (departureAt <= getBookingCutoff()) {
    throw poolingError(
      400,
      'DEPARTURE_TOO_SOON',
      `Please choose a departure at least ${BOOKING_CUTOFF_MINUTES} minutes from now.`,
    );
  }

  const distanceKm = round2(haversineKm(pickup, drop) * ROAD_DISTANCE_FACTOR);
  if (distanceKm < MIN_TRIP_DISTANCE_KM) {
    throw poolingError(400, 'TRIP_TOO_SHORT', 'Pickup and drop are too close together. Please choose different locations.');
  }

  const [trips, joinedTripIds] = await Promise.all([
    PoolingTrip.find({ status: 'open', travelDate, departureAt: { $gt: getBookingCutoff() } })
      .populate('vehicle', 'name vehicleModel vehicleNumber vehicleType images')
      .sort({ departureAt: 1 })
      .lean(),
    PoolingBooking.find({ user: userId, bookingStatus: 'confirmed' }).distinct('trip'),
  ]);

  const joinedSet = new Set(joinedTripIds.map(String));
  const joinable = [];
  const others = [];

  trips.forEach((trip) => {
    const verdict = classifyTripForRider(trip, { pickup, drop, departureAt });
    const seatsLeft = trip.capacity - trip.occupiedSeats;
    const serialized = serializeTrip(trip, { seats });

    if (joinedSet.has(String(trip._id))) {
      others.push({ ...serialized, reasonCode: 'ALREADY_JOINED', reason: "You're already on this ride." });
    } else if (!verdict.match) {
      others.push({ ...serialized, reasonCode: verdict.code, reason: verdict.message });
    } else if (seatsLeft < seats) {
      others.push({
        ...serialized,
        reasonCode: seatsLeft <= 0 ? 'TRIP_FULL' : 'NOT_ENOUGH_SEATS',
        reason: seatsLeft <= 0 ? 'This car is already full.' : `Only ${seatsLeft} seat${seatsLeft === 1 ? ' is' : 's are'} left in this car.`,
      });
    } else {
      joinable.push(serialized);
    }
  });

  const vehicles = await PoolingVehicle.find({ status: 'active', poolingEnabled: { $ne: false } }).lean();
  const newRideOptions = [];
  for (const vehicle of vehicles) {
    const capacity = getVehicleCapacity(vehicle);
    if (capacity < seats) continue;
    if (await isVehicleBusy(vehicle._id, departureAt, distanceKm)) continue;

    const totalCarFare = computeTotalCarFare(vehicle, distanceKm);
    newRideOptions.push({
      vehicleId: vehicle._id,
      name: vehicle.name,
      vehicleModel: vehicle.vehicleModel,
      vehicleType: vehicle.vehicleType,
      images: vehicle.images || [],
      capacity,
      totalCarFare,
      youPay: computeShare({ totalFare: totalCarFare, serviceTaxPercentage: vehicle.serviceTaxPercentage }, seats, seats).totalFare,
      lowestFarePerSeat: computeShare(
        { totalFare: totalCarFare, serviceTaxPercentage: vehicle.serviceTaxPercentage },
        1,
        capacity,
      ).totalFare,
    });
  }

  return ok(
    res,
    {
      query: { pickup, drop, travelDate, departureTime, seats, distanceKm },
      joinable,
      others,
      newRideOptions,
      matchRadiusKm: MATCH_RADIUS_KM,
      timeWindowMinutes: TIME_WINDOW_MINUTES,
    },
    'Pooling rides fetched successfully',
  );
});

/** Validates a join/create attempt and returns the amount due, without charging anything. */
export const quotePoolingBooking = asyncHandler(async (req, res) => {
  const userId = getCurrentUserId(req);
  if (!userId) throw new ApiError(401, 'User authentication is required');

  const plan = await planBooking({ userId, body: req.body });
  const walletBalance = await getWalletBalance(userId);

  return ok(
    res,
    {
      mode: plan.mode,
      seats: plan.seats,
      fare: plan.share.totalFare,
      baseFare: plan.share.baseFare,
      serviceTaxPercentage: plan.share.serviceTaxPercentage,
      serviceTaxAmount: plan.share.serviceTaxAmount,
      totalCarFare: plan.trip ? plan.trip.totalFare : plan.totalFare,
      occupiedSeatsAfter: plan.trip ? plan.trip.occupiedSeats + plan.seats : plan.seats,
      capacity: plan.trip ? plan.trip.capacity : plan.capacity,
      walletBalance,
    },
    'Quote ready',
  );
});

export const createPoolingPaymentOrder = asyncHandler(async (req, res) => {
  const userId = getCurrentUserId(req);
  if (!userId) throw new ApiError(401, 'User authentication is required');

  const plan = await planBooking({ userId, body: req.body });
  if (plan.share.totalFare <= 0) {
    throw new ApiError(400, 'Pooling fare is not configured');
  }

  const { keyId, keySecret } = await resolveConfiguredGatewayCredentials('razor_pay');
  const compactUserId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'usr';
  const order = await razorpayRequest({
    method: 'POST',
    path: '/orders',
    body: {
      amount: Math.round(plan.share.totalFare * 100),
      currency: 'INR',
      receipt: `upool_${compactUserId}_${Date.now().toString(36)}`,
      notes: { userId, kind: 'pooling', mode: plan.mode, tripId: plan.trip ? String(plan.trip._id) : '' },
    },
    keyId,
    keySecret,
  });

  return created(
    res,
    {
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency || 'INR',
      fare: plan.share.totalFare,
    },
    'Pooling payment order created successfully',
  );
});

export const verifyPoolingPayment = asyncHandler(async (req, res) => {
  const userId = getCurrentUserId(req);
  if (!userId) throw new ApiError(401, 'User authentication is required');

  const orderId = toCleanString(req.body?.razorpay_order_id);
  const paymentId = toCleanString(req.body?.razorpay_payment_id);
  const signature = toCleanString(req.body?.razorpay_signature);
  if (!orderId || !paymentId || !signature) {
    throw new ApiError(400, 'Payment verification fields are required');
  }

  const { keyId, keySecret } = await resolveConfiguredGatewayCredentials('razor_pay');
  const expectedSignature = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  if (expectedSignature !== signature) {
    throw new ApiError(400, 'Invalid payment signature');
  }

  const existing = await PoolingBooking.findOne({ user: userId, 'payment.paymentId': paymentId })
    .populate('vehicle', 'name vehicleNumber vehicleModel images')
    .lean();
  if (existing) {
    return ok(res, serializeBooking(existing), 'Pooling booking already confirmed');
  }

  // The order is the source of truth for what was charged and for whom.
  const order = await razorpayRequest({ method: 'GET', path: `/orders/${orderId}`, keyId, keySecret });
  if (String(order?.notes?.userId || '') !== userId || order?.notes?.kind !== 'pooling') {
    throw new ApiError(403, 'This payment does not belong to your account');
  }

  const paidAmount = round2(Number(order.amount || 0) / 100);
  const booking = await finalizeBooking({
    userId,
    body: req.body,
    paidAmount,
    payment: { provider: 'razorpay', orderId, paymentId, signature },
  });

  return created(res, serializeBooking(booking), 'Pooling booking confirmed successfully');
});

export const payPoolingWithWallet = asyncHandler(async (req, res) => {
  const userId = getCurrentUserId(req);
  if (!userId) throw new ApiError(401, 'User authentication is required');

  const requestId = toCleanString(req.body?.requestId).slice(0, 64) || crypto.randomUUID();
  const walletOrderId = `wallet:${requestId}`;

  const existing = await PoolingBooking.findOne({ user: userId, 'payment.orderId': walletOrderId })
    .populate('vehicle', 'name vehicleNumber vehicleModel images')
    .lean();
  if (existing) {
    return ok(res, serializeBooking(existing), 'Pooling booking already confirmed');
  }

  const plan = await planBooking({ userId, body: req.body });
  const amount = plan.share.totalFare;

  const debited = await debitUserWallet({
    userId,
    amount,
    title: `Pool ride ${shortPlace(plan.pickup.label)} → ${shortPlace(plan.drop.label)}`,
    referenceKey: `pool-pay:${requestId}`,
  });
  if (!debited) {
    throw poolingError(
      402,
      'INSUFFICIENT_WALLET',
      `Your wallet balance is too low for ₹${amount}. Add money or pay with UPI/card.`,
    );
  }

  const booking = await finalizeBooking({
    userId,
    body: req.body,
    paidAmount: amount,
    payment: { provider: 'wallet', orderId: walletOrderId, paymentId: `wallet-${requestId}`, signature: '' },
  });

  return created(res, serializeBooking(booking), 'Pooling booking confirmed successfully');
});

export const getMyPoolingBookings = asyncHandler(async (req, res) => {
  const userId = getCurrentUserId(req);
  if (!userId) {
    return ok(res, [], 'My bookings fetched successfully');
  }

  const bookings = await PoolingBooking.find({ user: userId })
    .populate('vehicle', 'name vehicleNumber vehicleModel images')
    .sort({ createdAt: -1 })
    .lean();

  return ok(res, bookings.map(serializeBooking), 'My bookings fetched successfully');
});
