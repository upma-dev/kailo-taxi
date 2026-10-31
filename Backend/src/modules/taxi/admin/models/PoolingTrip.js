import mongoose from 'mongoose';

const tripPointSchema = new mongoose.Schema(
  {
    label: { type: String, default: '', trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false },
);

// One physical car going from A to B at a given time. Riders join it as PoolingBookings
// and the single `totalFare` is split between everyone based on seats occupied.
const poolingTripSchema = new mongoose.Schema(
  {
    tripCode: { type: String, required: true, unique: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiPoolingVehicle', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    origin: { type: tripPointSchema, required: true },
    destination: { type: tripPointSchema, required: true },
    travelDate: { type: String, required: true, trim: true },
    departureTime: { type: String, required: true, trim: true },
    departureAt: { type: Date, required: true },
    distanceKm: { type: Number, default: 0, min: 0 },
    // Full fare of the car (before service tax). Fixed at trip creation.
    totalFare: { type: Number, required: true, min: 0 },
    serviceTaxPercentage: { type: Number, default: 0, min: 0, max: 100 },
    capacity: { type: Number, required: true, min: 1 },
    occupiedSeats: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['open', 'cancelled', 'completed'], default: 'open' },
  },
  { timestamps: true },
);

poolingTripSchema.index({ status: 1, travelDate: 1 });
poolingTripSchema.index({ departureAt: 1 });

export const PoolingTrip =
  mongoose.models.TaxiPoolingTrip || mongoose.model('TaxiPoolingTrip', poolingTripSchema);
