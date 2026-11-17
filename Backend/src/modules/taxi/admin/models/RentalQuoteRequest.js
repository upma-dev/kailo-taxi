import mongoose from 'mongoose';

const rentalQuoteRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxiUser',
      default: null,
    },
    // A self-drive quote points at a rental vehicle type; a "with driver" quote at a driver rental vehicle.
    vehicleTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxiRentalVehicleType',
      default: null,
    },
    driverVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxiRentalDriverVehicle',
      default: null,
    },
    vehicleName: {
      type: String,
      default: '',
      trim: true,
    },
    vehicleCategory: {
      type: String,
      default: '',
      trim: true,
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },
    contactEmail: {
      type: String,
      default: '',
      trim: true,
    },
    requestedHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    pickupDateTime: {
      type: Date,
      default: null,
    },
    returnDateTime: {
      type: Date,
      default: null,
    },
    seatsNeeded: {
      type: Number,
      default: 1,
      min: 1,
    },
    luggageNeeded: {
      type: Number,
      default: 0,
      min: 0,
    },
    pickupLocation: {
      type: String,
      default: '',
      trim: true,
    },
    dropLocation: {
      type: String,
      default: '',
      trim: true,
    },
    specialRequirements: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'quoted', 'rejected'],
      default: 'pending',
    },
    adminQuotedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    adminNote: {
      type: String,
      default: '',
      trim: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    // 'self_drive' = rider drives; 'with_driver' = the rental comes with a driver.
    serviceMode: {
      type: String,
      enum: ['self_drive', 'with_driver'],
      default: 'self_drive',
    },
    // Service centers that can see and answer this request (the centers linked to the vehicle), and the
    // staff member who is handling it.
    serviceCenterIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'TaxiServiceStore',
      default: [],
    },
    assignedStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxiServiceCenterStaff',
      default: null,
    },
    assignedStaffName: { type: String, default: '', trim: true },
    assignedStaffPhone: { type: String, default: '', trim: true },
    // Who sent the last answer: the admin, a service center or one of its staff.
    respondedByRole: {
      type: String,
      enum: ['', 'admin', 'service_center', 'service_center_staff'],
      default: '',
    },
    respondedByName: { type: String, default: '', trim: true },
  },
  { timestamps: true },
);

rentalQuoteRequestSchema.index({ status: 1, createdAt: -1 });
rentalQuoteRequestSchema.index({ vehicleTypeId: 1, createdAt: -1 });
rentalQuoteRequestSchema.index({ serviceCenterIds: 1, createdAt: -1 });

// Alerts for the service center app (who hears what is decided in centerNotificationService).
rentalQuoteRequestSchema.pre('save', function captureCenterEvents(next) {
  this.$locals.centerEvents = {
    isNew: this.isNew,
    staffChanged: this.isModified('assignedStaffId'),
    statusChanged: this.isModified('status'),
  };
  next();
});
rentalQuoteRequestSchema.post('save', function sendCenterAlerts(doc) {
  const ev = doc.$locals?.centerEvents;
  if (!ev) return;
  import('../../services/centerNotificationService.js')
    .then((service) => service.handleRentalSaved('rental_quote', doc, ev))
    .catch(() => {});
});

export const RentalQuoteRequest =
  mongoose.models.TaxiRentalQuoteRequest ||
  mongoose.model('TaxiRentalQuoteRequest', rentalQuoteRequestSchema);
