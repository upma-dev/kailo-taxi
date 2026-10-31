import { PoolingVehicle } from '../models/PoolingVehicle.js';
import { PoolingBooking } from '../models/PoolingBooking.js';
import { PoolingRoute } from '../models/PoolingRoute.js';
import { PoolingSeatReservation } from '../models/PoolingSeatReservation.js';
import { PoolingTrip } from '../models/PoolingTrip.js';
import { UserWallet } from '../../user/models/UserWallet.js';
import { ApiError } from '../../../../utils/ApiError.js';
import { asyncHandler } from '../../../../utils/asyncHandler.js';
import { uploadDataUrlToCloudinary } from '../../../../utils/cloudinaryUpload.js';

const ok = (res, data, message) => res.status(200).json({ success: true, data, message });
const created = (res, data, message) => res.status(201).json({ success: true, data, message });

// --- Pooling Vehicles ---

export const getPoolingVehicles = asyncHandler(async (req, res) => {
  const vehicles = await PoolingVehicle.find().sort({ createdAt: -1 });
  return ok(res, vehicles, 'Pooling vehicles fetched successfully');
});

export const createPoolingVehicle = asyncHandler(async (req, res) => {
  const vehicle = await PoolingVehicle.create(req.body);
  return created(res, vehicle, 'Pooling vehicle created successfully');
});

export const updatePoolingVehicle = asyncHandler(async (req, res) => {
  const vehicle = await PoolingVehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  return ok(res, vehicle, 'Pooling vehicle updated successfully');
});

export const deletePoolingVehicle = asyncHandler(async (req, res) => {
  const vehicle = await PoolingVehicle.findByIdAndDelete(req.params.id);
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  return ok(res, null, 'Pooling vehicle deleted successfully');
});

// --- Pooling Bookings ---

export const getPoolingBookings = asyncHandler(async (req, res) => {
  const bookings = await PoolingBooking.find()
    .populate('user', 'name phone email')
    .populate('route', 'routeName originLabel destinationLabel')
    .populate('vehicle', 'name vehicleNumber')
    .sort({ createdAt: -1 });
  return ok(res, bookings, 'Pooling bookings fetched successfully');
});

export const updatePoolingBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const previous = await PoolingBooking.findById(req.params.id);
  if (!previous) throw new ApiError(404, 'Booking not found');

  const booking = await PoolingBooking.findByIdAndUpdate(
    req.params.id,
    { bookingStatus: status },
    { new: true }
  );

  // A cancelled car-pool rider gives their seat back and gets what they currently owe
  // returned to the wallet. Remaining riders keep the (lower) fare they already have.
  const normalizedStatus = String(status || '').toLowerCase();
  if (previous.bookingStatus === 'confirmed' && booking.trip && ['cancelled', 'no_show'].includes(normalizedStatus)) {
    await PoolingTrip.updateOne(
      { _id: booking.trip, occupiedSeats: { $gte: booking.seatsBooked } },
      { $inc: { occupiedSeats: -booking.seatsBooked } },
    );

    const refundAmount = Math.round(Number(booking.fare || 0) * 100) / 100;
    if (normalizedStatus === 'cancelled' && refundAmount > 0) {
      await UserWallet.updateOne(
        { userId: booking.user },
        {
          $inc: { balance: refundAmount },
          $push: {
            transactions: {
              $each: [{
                kind: 'credit',
                amount: refundAmount,
                title: 'Pool ride cancelled - refund',
                provider: 'pooling',
                referenceKey: `pool-cancel:${booking._id}`,
              }],
              $slice: -50,
            },
          },
        },
        { upsert: true },
      );
      booking.paymentStatus = 'refunded';
      await booking.save();
    }
  }

  if (['cancelled', 'no_show'].includes(String(status || '').toLowerCase())) {
    await PoolingSeatReservation.deleteMany({ booking: booking._id });
  }

  return ok(res, booking, 'Booking status updated successfully');
});

// --- Routes & Stops (Already mostly handled, but adding placeholders for consistency) ---

export const getPoolingRoutes = asyncHandler(async (req, res) => {
  const routes = await PoolingRoute.find().sort({ createdAt: -1 });
  return ok(res, routes, 'Pooling routes fetched successfully');
});

// --- Common Upload ---

export const uploadImage = asyncHandler(async (req, res) => {
  const { image } = req.body;
  if (!image) throw new ApiError(400, 'Image data is required');

  const result = await uploadDataUrlToCloudinary({
    dataUrl: image,
    publicIdPrefix: 'pooling-vehicle',
  });

  return ok(res, { url: result.secureUrl }, 'Image uploaded successfully');
});
