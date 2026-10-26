import { PageContent } from '../models/PageContent.js';
import { ApiError } from '../../../../utils/ApiError.js';

export const LEGAL_PAGE_KEYS = [
  'terms',
  'driver-terms',
  'privacy',
  'driver-privacy',
  'refund',
  'shipping',
  'cancellation',
  'dmv-compliance',
];

const normalizeKey = (key) => String(key || '').trim().toLowerCase();

const decodeHtmlEntities = (value) => {
  if (value === null || value === undefined) return value;
  const s = String(value);
  if (!s.includes('&')) return s;
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
};

const normalizeLegalForResponse = (legal) => {
  if (!legal || typeof legal !== 'object') return legal;
  return { ...legal, title: legal.title ?? '', content: decodeHtmlEntities(legal.content ?? '') };
};

const normalizeAboutForResponse = (about) => {
  if (!about || typeof about !== 'object') return about;
  return {
    ...about,
    appName: decodeHtmlEntities(about.appName ?? ''),
    version: decodeHtmlEntities(about.version ?? ''),
    description: decodeHtmlEntities(about.description ?? ''),
    logo: decodeHtmlEntities(about.logo ?? ''),
  };
};

const DEFAULT_PAGES = {
  terms: {
    title: 'User Terms and Conditions',
    content: `<h2>User Terms and Conditions</h2><p>Welcome to Kailo Taxi. By accessing or using our application, website, and services, you agree to be bound by these Terms and Conditions.</p><h3>1. Account Registration</h3><p>You must provide accurate information when registering an account. You are responsible for maintaining the confidentiality of your account credentials.</p><h3>2. Platform Services</h3><p>Kailo Taxi connects riders with independent drivers for city rides, parcel delivery, rentals, bus and intercity trips.</p><h3>3. Payments and Cancellation</h3><p>Payments made through the platform are processed securely. Cancellations and refunds are governed by our active cancellation and refund policies.</p><h3>4. User Conduct</h3><p>Users must not engage in fraudulent activities, abuse referral bonuses, or misuse system services.</p>`,
  },
  'driver-terms': {
    title: 'Driver Partner Terms and Conditions',
    content: `<h2>Driver Partner Terms and Conditions</h2><p>These terms govern driver partners operating cab, auto, bike, and intercity transit services on the Kailo Taxi platform.</p><h3>1. Vehicle Standards</h3><p>Drivers must maintain roadworthy, clean, and insured vehicles with valid commercial or private permits as applicable.</p><h3>2. Safety & Standards</h3><p>Drivers must strictly comply with local speed limits, navigation routes, and safety protocols.</p><h3>3. Fare Bidding & Policy</h3><p>Ride fares and bid percentages must stay within configured admin policy ranges. Tariff manipulation is prohibited.</p>`,
  },
  privacy: {
    title: 'User Privacy Policy',
    content: `<h2>User Privacy Policy</h2><p>Kailo Taxi values your privacy. This Privacy Policy details how we collect, use, and protect your personal information.</p><h3>1. Information We Collect</h3><p>We collect your phone number, name, email address, saved addresses, and precise GPS location when using active app features.</p><h3>2. How We Use Information</h3><p>Location data is used solely to match you with nearby drivers, calculate trip distances, and fulfill rides.</p><h3>3. Data Security</h3><p>We implement end-to-end security protocols. We do not sell or trade your personal information to third parties.</p>`,
  },
  'driver-privacy': {
    title: 'Driver Partner Privacy Policy',
    content: `<h2>Driver Partner Privacy Policy</h2><p>Outlines driver document verification, trip route tracking, location monitoring, and account data security standards for Kailo Taxi.</p><h3>1. Duty Location Tracking</h3><p>High-precision location data is collected while on duty or during active ride assignments to match rider pickup points and provide trip navigation.</p><h3>2. Safety & SOS Monitoring</h3><p>Location logs during active trips are monitored to support emergency SOS features, route deviation alerts, and safety audits.</p><h3>3. Contact Masking</h3><p>Rider and driver phone numbers are masked through anonymous proxy numbers during in-app call connections.</p>`,
  },
  refund: {
    title: 'Refund Policy',
    content: `<h2>Refund Policy</h2><p>Rides canceled before a driver is assigned, or due to driver unavailability, will be fully refunded to the original payment method within 3-5 business days.</p>`,
  },
  shipping: {
    title: 'Parcel & Shipping Policy',
    content: `<h2>Parcel & Shipping Policy</h2><p>Parcels are picked up by nearby drivers shortly after booking. Estimated delivery times are shown prior to booking based on live traffic and distance.</p>`,
  },
  cancellation: {
    title: 'Cancellation Policy',
    content: 'A cancellation charge will apply as per configured rules once a driver has been assigned.',
  },
  'dmv-compliance': {
    title: 'DMV & Transport Compliance',
    content: `<h2>DMV & Transport Compliance</h2><p>All drivers and vehicles on Kailo Taxi must comply with local motor vehicle and transport authority regulations, including valid licenses, registration, insurance and permits.</p>`,
  },
  home: {
    eyebrowBadge: 'SAFE, FAST & AFFORDABLE RIDES',
    heroTitle: 'Book Your Ride in Seconds.',
    heroSubtitle: 'City rides, parcels, rentals, bus and intercity trips — all in one Kailo Taxi app.',
    ctaPrimaryText: 'Book Ride Now',
    ctaSecondaryText: 'Become a Driver',
    heroImage: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1000',
    appStoreUrl: 'https://apple.com',
    playStoreUrl: 'https://play.google.com',
    stats: [
      { label: 'Total Rides', value: '1M+' },
      { label: 'Active Drivers', value: '50K+' },
      { label: 'Cities Covered', value: '100+' },
      { label: 'Rating', value: '4.9/5' },
    ],
    features: [
      { id: 1, title: 'Rides', desc: 'City Cabs & Ride Pooling', icon: '🚕' },
      { id: 2, title: 'Parcel', desc: 'Express Citywide Couriers', icon: '📦' },
      { id: 3, title: 'Rental', desc: 'Hourly & Daily Rentals', icon: '🚗' },
      { id: 4, title: 'Intercity', desc: 'Outstation & Bus Trips', icon: '🚌' },
    ],
  },
};

export const getPublicPageByKey = async (key) => {
  const k = normalizeKey(key);
  const doc = await PageContent.findOne({ key: k }).lean();
  if (!doc) {
    if (k === 'about') {
      return { key: k, data: { appName: 'Kailo Taxi', version: '1.0.0', description: '', logo: '' } };
    }
    return { key: k, data: DEFAULT_PAGES[k] || { title: '', content: '' } };
  }
  if (k === 'about') return { key: k, data: normalizeAboutForResponse(doc.about || null) };
  if (k === 'home') return { key: k, data: doc.home || DEFAULT_PAGES.home };

  const legalData = normalizeLegalForResponse(doc.legal || null);
  if (!legalData || !legalData.content || !legalData.content.trim()) {
    return { key: k, data: DEFAULT_PAGES[k] || legalData || { title: '', content: '' } };
  }
  return { key: k, data: legalData };
};

export const getAdminPageByKey = getPublicPageByKey;

const upsertPage = async (key, fields, updatedBy) =>
  PageContent.findOneAndUpdate(
    { key },
    { $set: { key, ...fields, updatedBy: updatedBy || null, updatedByRole: 'ADMIN' } },
    { upsert: true, new: true },
  ).lean();

export const upsertLegalPage = async (key, payload, updatedBy) => {
  const k = normalizeKey(key);
  if (!LEGAL_PAGE_KEYS.includes(k)) {
    throw new ApiError(400, 'Invalid page key');
  }
  const title = String(payload?.title || '').trim();
  const content = decodeHtmlEntities(String(payload?.content || '')).trim();

  const doc = await upsertPage(k, { legal: { title, content } }, updatedBy);
  return { key: k, data: normalizeLegalForResponse(doc?.legal || null) };
};

export const upsertAboutPage = async (payload, updatedBy) => {
  const appName = decodeHtmlEntities(String(payload?.appName || '')).trim() || 'Kailo Taxi';
  const version = decodeHtmlEntities(String(payload?.version || '')).trim() || '1.0.0';
  const description = decodeHtmlEntities(String(payload?.description || '')).trim();
  const logo = decodeHtmlEntities(String(payload?.logo || '')).trim();
  const features = Array.isArray(payload?.features) ? payload.features : [];
  const stats = Array.isArray(payload?.stats) ? payload.stats : [];

  const normalizedFeatures = features.map((f, idx) => ({
    icon: String(f?.icon || 'Heart'),
    title: String(f?.title || ''),
    description: String(f?.description || ''),
    color: String(f?.color || ''),
    bgColor: String(f?.bgColor || ''),
    order: Number.isFinite(Number(f?.order)) ? Number(f.order) : idx,
  }));

  const doc = await upsertPage(
    'about',
    { about: { appName, version, description, logo, features: normalizedFeatures, stats } },
    updatedBy,
  );
  return { key: 'about', data: normalizeAboutForResponse(doc?.about || null) };
};

export const upsertHomePage = async (payload, updatedBy) => {
  const homeData = payload?.home || payload || {};
  const doc = await upsertPage('home', { home: homeData }, updatedBy);
  return { key: 'home', data: doc?.home || homeData };
};
