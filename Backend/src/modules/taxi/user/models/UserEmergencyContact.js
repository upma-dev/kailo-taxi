import mongoose from 'mongoose';

// A person the rider wants to be alerted when the rider triggers SOS.
const userEmergencyContactSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiUser', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

userEmergencyContactSchema.index({ userId: 1, phone: 1 }, { unique: true });

export const UserEmergencyContact =
  mongoose.models.TaxiUserEmergencyContact || mongoose.model('TaxiUserEmergencyContact', userEmergencyContactSchema);
