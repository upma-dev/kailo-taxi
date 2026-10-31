import mongoose from 'mongoose';

const landingLeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120, default: '' },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    role: { type: String, trim: true, maxlength: 30, default: 'user' },
    message: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new', index: true },
  },
  { collection: 'landing_leads', timestamps: true },
);

export const LandingLead = mongoose.models.LandingLead || mongoose.model('LandingLead', landingLeadSchema);
