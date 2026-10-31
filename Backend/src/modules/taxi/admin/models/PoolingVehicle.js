import mongoose from 'mongoose';

const poolingVehicleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleModel: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    adminCommissionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    serviceTaxPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // Car-pool pricing: totalFare = max(minFare, baseFare + pricePerKm * distanceKm).
    // pricePerKm = 0 falls back to POOLING_DEFAULT_PRICE_PER_KM.
    baseFare: {
      type: Number,
      default: 0,
      min: 0,
    },
    pricePerKm: {
      type: Number,
      default: 0,
      min: 0,
    },
    minFare: {
      type: Number,
      default: 0,
      min: 0,
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'sedan', 'hatchback', 'suv', 'van', 'luxury'],
      default: 'sedan',
    },
    blueprint: {
      type: Object, // JSON layout of seats
      default: {},
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
    poolingEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

poolingVehicleSchema.index({ status: 1 });

export const PoolingVehicle =
  mongoose.models.TaxiPoolingVehicle ||
  mongoose.model('TaxiPoolingVehicle', poolingVehicleSchema);
