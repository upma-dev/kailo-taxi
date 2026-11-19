import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// "Rental with Driver" is its own catalog, separate from the self-drive Rental Vehicles:
//  - TaxiRentalDriverVehicle: a vehicle that comes with a driver, with its own packages and prices
//  - TaxiRentalDriver: a driver listed under a service center (assigned to bookings by the center or the admin)
//  - TaxiRentalDriverBooking: a rider's booking of one of those vehicles

const packageSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    durationHours: { type: Number, default: 0, min: 0 },
    kmLimit: { type: Number, default: 0, min: 0 },
    price: { type: Number, required: true, min: 0 },
    extraHourPrice: { type: Number, default: 0, min: 0 },
    extraKmPrice: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { _id: true },
);

const rentalDriverVehicleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    vehicleCategory: { type: String, default: 'Car', trim: true },
    image: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    capacity: { type: Number, default: 4, min: 1 },
    luggageCapacity: { type: Number, default: 0, min: 0 },
    amenities: { type: [String], default: [] },
    packages: { type: [packageSchema], default: [] },
    // Centers that serve this vehicle and see its bookings.
    serviceCenterIds: { type: [ObjectId], ref: 'TaxiServiceStore', default: [] },
    // Set when a service center created the vehicle itself (only that center, or the admin, can then edit it).
    ownerCenterId: { type: ObjectId, ref: 'TaxiServiceStore', default: null },
    status: { type: String, default: 'active', trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
rentalDriverVehicleSchema.index({ serviceCenterIds: 1 });
rentalDriverVehicleSchema.index({ status: 1, active: 1 });

const rentalDriverSchema = new mongoose.Schema(
  {
    serviceCenterId: { type: ObjectId, ref: 'TaxiServiceStore', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    licenseNumber: { type: String, default: '', trim: true },
    experienceYears: { type: Number, default: 0, min: 0 },
    languages: { type: [String], default: [] },
    photo: { type: String, default: '', trim: true },
    status: { type: String, default: 'active', trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
rentalDriverSchema.index({ serviceCenterId: 1, phone: 1 }, { unique: true });

const rentalDriverBookingSchema = new mongoose.Schema(
  {
    bookingReference: { type: String, required: true, unique: true, trim: true },
    userId: { type: ObjectId, ref: 'TaxiUser', default: null },
    driverVehicleId: { type: ObjectId, ref: 'TaxiRentalDriverVehicle', required: true },
    vehicleName: { type: String, default: '', trim: true },
    vehicleCategory: { type: String, default: '', trim: true },
    vehicleImage: { type: String, default: '', trim: true },
    selectedPackage: {
      packageId: { type: String, default: '' },
      label: { type: String, default: '' },
      durationHours: { type: Number, default: 0 },
      kmLimit: { type: Number, default: 0 },
      price: { type: Number, default: 0 },
      extraHourPrice: { type: Number, default: 0 },
      extraKmPrice: { type: Number, default: 0 },
    },
    totalCost: { type: Number, default: 0, min: 0 },
    pickupDateTime: { type: Date, required: true },
    pickupLocation: { type: String, required: true, trim: true },
    dropLocation: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    contactName: { type: String, required: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'assigned', 'completed', 'cancelled'],
      default: 'pending',
    },
    serviceCenterIds: { type: [ObjectId], ref: 'TaxiServiceStore', default: [] },
    assignedStaffId: { type: ObjectId, ref: 'TaxiServiceCenterStaff', default: null },
    assignedStaffName: { type: String, default: '', trim: true },
    assignedStaffPhone: { type: String, default: '', trim: true },
    assignedDriverId: { type: ObjectId, ref: 'TaxiRentalDriver', default: null },
    assignedDriverName: { type: String, default: '', trim: true },
    assignedDriverPhone: { type: String, default: '', trim: true },
    // Message from the center or admin that the rider can read.
    note: { type: String, default: '', trim: true },
    cancelReason: { type: String, default: '', trim: true },
    updatedByRole: { type: String, enum: ['', 'admin', 'service_center', 'service_center_staff', 'user'], default: '' },
    // The rider says the trip with the driver has ended (the center then marks it completed).
    returnRequestedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
rentalDriverBookingSchema.index({ serviceCenterIds: 1, createdAt: -1 });
rentalDriverBookingSchema.index({ userId: 1, createdAt: -1 });
rentalDriverBookingSchema.index({ status: 1, createdAt: -1 });

// Alerts for the service center app (who hears what is decided in centerNotificationService).
rentalDriverBookingSchema.pre('save', function captureCenterEvents(next) {
  this.$locals.centerEvents = {
    isNew: this.isNew,
    staffChanged: this.isModified('assignedStaffId'),
    statusChanged: this.isModified('status'),
    returnRequested: this.isModified('returnRequestedAt'),
  };
  next();
});
rentalDriverBookingSchema.post('save', function sendCenterAlerts(doc) {
  const ev = doc.$locals?.centerEvents;
  if (!ev) return;
  import('../../services/centerNotificationService.js')
    .then((service) => service.handleRentalSaved('driver_booking', doc, ev))
    .catch(() => {});
});

export const RentalDriverVehicle =
  mongoose.models.TaxiRentalDriverVehicle || mongoose.model('TaxiRentalDriverVehicle', rentalDriverVehicleSchema);
export const RentalDriver =
  mongoose.models.TaxiRentalDriver || mongoose.model('TaxiRentalDriver', rentalDriverSchema);
export const RentalDriverBooking =
  mongoose.models.TaxiRentalDriverBooking || mongoose.model('TaxiRentalDriverBooking', rentalDriverBookingSchema);
