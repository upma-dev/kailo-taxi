import mongoose from 'mongoose';

const loginBannerSchema = new mongoose.Schema({
  app: { type: String, enum: ['user', 'partner'], required: true, index: true },
  tag: { type: String, default: '' },
  code: { type: String, default: '' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  theme: { type: String, default: 'emerald' },
  image: { type: String, default: '' },
  video: { type: String, default: '' },
  link: { type: String, default: '' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const loginBannerSettingSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  user_enabled: { type: Boolean, default: true },
  partner_enabled: { type: Boolean, default: true },
  // Login screen look & copy, shared by the user and the driver / owner app.
  header_from: { type: String, default: '#0F766E' },
  header_to: { type: String, default: '#0A4A46' },
  accent_color: { type: String, default: '#C6F432' },
  tagline_user: { type: String, default: 'Rides, parcels and outstation trips, all in one app' },
  tagline_partner: { type: String, default: 'Drive, earn and grow with Kailo.' },
  show_support: { type: Boolean, default: true },
  support_text: { type: String, default: 'Need assistance?' },
  support_label: { type: String, default: 'Contact Support' },
  support_link: { type: String, default: '/taxi/contact' },
  copyright_text: { type: String, default: '© 2026 Xfotech Pvt Ltd. All rights reserved.' },
  // The fields above are the user app's look. The driver / owner (partner) app can override
  // each one; an empty / null override falls back to the value above.
  partner_header_from: { type: String, default: '' },
  partner_header_to: { type: String, default: '' },
  partner_accent_color: { type: String, default: '' },
  partner_show_support: { type: Boolean, default: null },
  partner_support_text: { type: String, default: '' },
  partner_support_label: { type: String, default: '' },
  partner_support_link: { type: String, default: '' },
  partner_copyright_text: { type: String, default: '' },
  // Public Contact Us page (/taxi/contact).
  contact_heading: { type: String, default: "We're Here to" },
  contact_highlight: { type: String, default: 'Help' },
  contact_intro: { type: String, default: 'Got a question or need assistance? Reach out to our dedicated support team available 24/7.' },
  contact_phone: { type: String, default: '7409129517' },
  contact_email: { type: String, default: 'support@kailotaxi.com' },
  contact_address: { type: String, default: 'Office No. 110,\nB. K Tower, H-65, Sec-63,\nNoida 201301' },
  contact_hours: { type: String, default: 'Our platform operates 24 hours a day, 7 days a week. Support is always online.' },
}, { timestamps: true });

export const LoginBanner = mongoose.models.TaxiLoginBanner || mongoose.model('TaxiLoginBanner', loginBannerSchema);
export const LoginBannerSetting = mongoose.models.TaxiLoginBannerSetting || mongoose.model('TaxiLoginBannerSetting', loginBannerSettingSchema);
