import mongoose from 'mongoose';

const imageSchema = {
  url: { type: String, default: '' },
  publicId: { type: String, default: '' },
};

const businessSettingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, default: 'Kailo Taxi' },
    email: { type: String, required: true, default: 'admin@kailotaxi.com' },
    phone: {
      countryCode: { type: String, default: '+91' },
      number: { type: String, default: '' },
    },
    address: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    region: { type: String, default: 'India' },
    logo: imageSchema,
    favicon: imageSchema,
    themeColor: { type: String, default: '' },
    landingThemeColor: { type: String, default: '' },
    sidebarTextColor: { type: String, default: '' },
    // Per-app color combinations: { admin|taxiUser|taxiDriver: { primary, secondary } }
    appColors: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  // Collection name kept so branding saved before the rename is still served.
  { timestamps: true, collection: 'foodbusinesssettings' },
);

export const BusinessSettings =
  mongoose.models.BusinessSettings || mongoose.model('BusinessSettings', businessSettingsSchema);
