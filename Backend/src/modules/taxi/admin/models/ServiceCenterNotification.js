import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// An alert for the service center app. `recipientId` is the center (for the owner) or the staff member.
const serviceCenterNotificationSchema = new mongoose.Schema(
  {
    recipientRole: { type: String, enum: ['service_center', 'service_center_staff'], required: true },
    recipientId: { type: ObjectId, required: true },
    serviceCenterId: { type: ObjectId, ref: 'TaxiServiceStore', default: null },
    // Which request: a self-drive booking, a custom quote, or a booking with driver.
    kind: { type: String, enum: ['rental_booking', 'rental_quote', 'driver_booking'], required: true },
    refId: { type: ObjectId, required: true },
    event: { type: String, enum: ['new', 'assigned', 'returned', 'cancelled'], required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '', trim: true },
    readAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 45 },
  },
  { versionKey: false },
);
serviceCenterNotificationSchema.index({ recipientRole: 1, recipientId: 1, createdAt: -1 });

export const ServiceCenterNotification =
  mongoose.models.TaxiServiceCenterNotification ||
  mongoose.model('TaxiServiceCenterNotification', serviceCenterNotificationSchema);
