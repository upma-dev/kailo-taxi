import mongoose from 'mongoose';

// A plan a driver bought (Admin -> Drivers -> Subscription). While it is active:
// - mode "subscriptionOnly": the driver may go online and gets rides, with no commission,
// - mode "both": the driver pays no commission on rides (drivers without a plan pay commission).
const driverSubscriptionSchema = new mongoose.Schema(
  {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiDriver', required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiSubscriptionPlan', required: true },
    name: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    amount: { type: Number, default: 0, min: 0 },
    durationDays: { type: Number, default: 0, min: 0 },
    transport_type: { type: String, default: '', trim: true },
    vehicle_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiVehicle', default: null },
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active', index: true },
    purchaseSource: { type: String, enum: ['wallet', 'admin'], default: 'wallet' },
    purchasedAt: { type: Date, default: Date.now },
    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    walletTransactionId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

driverSubscriptionSchema.index({ driverId: 1, status: 1, expiresAt: -1 });

export const DriverSubscription =
  mongoose.models.TaxiDriverSubscription || mongoose.model('TaxiDriverSubscription', driverSubscriptionSchema);
