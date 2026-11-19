import { PageContent } from '../models/PageContent.js';
import { ApiError } from '../../../../utils/ApiError.js';
import { BIKE_AUTO_SLIDES, DEFAULT_LANDING, NEW_SLIDES } from '../data/defaultLanding.js';

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

const RESERVED_KEYS = ['about', 'home', 'landing', 'legal-index'];
const LEGAL_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,59}$/;

// Any <app>-<document> style key is a legal page, except the CMS keys that hold other content.
export const isLegalPageKey = (key) => {
  const k = String(key || '').trim().toLowerCase();
  return LEGAL_KEY_PATTERN.test(k) && !RESERVED_KEYS.includes(k);
};

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
  return {
    ...legal,
    title: legal.title ?? '',
    intro: decodeHtmlEntities(legal.intro ?? ''),
    content: decodeHtmlEntities(legal.content ?? ''),
  };
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
    content: `<h2>Refund Policy</h2><h3>1. When you get a refund</h3><p>Rides canceled before a driver is assigned, or because no driver is available, are refunded in full to the original payment method.</p><h3>2. How long it takes</h3><p>Refunds reach your bank, card or UPI account within 3-5 business days.</p><h3>3. Wallet payments</h3><p>If you paid from your Kailo wallet, the amount is returned to your wallet straight away.</p><h3>4. Need help?</h3><p>If a refund has not arrived in time, contact our support team from the Help section of the app.</p>`,
  },
  shipping: {
    title: 'Parcel & Shipping Policy',
    content: `<h2>Parcel & Shipping Policy</h2><h3>1. Pickup</h3><p>Parcels are picked up by a nearby driver shortly after booking.</p><h3>2. Delivery time</h3><p>The estimated delivery time is shown before you book, based on live traffic and distance.</p><h3>3. What you can send</h3><p>Illegal, dangerous or restricted items cannot be sent. Declare the parcel contents correctly when booking.</p><h3>4. Damage or loss</h3><p>If a parcel is damaged or lost, report it from the app and our team will review it.</p>`,
  },
  cancellation: {
    title: 'Cancellation Policy',
    content: `<h2>Cancellation Policy</h2><h3>1. Free cancellation</h3><p>You can cancel for free until a driver is assigned.</p><h3>2. Cancellation charges</h3><p>A cancellation charge applies as per the configured rules once a driver has been assigned. The exact amount is shown in the app before you confirm.</p><h3>3. Driver cancellations</h3><p>If the driver cancels, you are not charged and we help you find another ride.</p>`,
  },
  'dmv-compliance': {
    title: 'DMV & Transport Compliance',
    content: `<h2>DMV & Transport Compliance</h2><h3>1. Licenses and permits</h3><p>All drivers must hold a valid driving license and the permits required for their vehicle type.</p><h3>2. Vehicle registration and insurance</h3><p>Every vehicle must have valid registration and insurance, and must pass local fitness checks.</p><h3>3. Local regulations</h3><p>Drivers and vehicles must follow the motor vehicle and transport authority rules of the city they operate in.</p>`,
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

export const DEFAULT_LEGAL_INDEX = {
  apps: [
    { id: 'user', label: 'Rider App' },
    { id: 'driver', label: 'Driver App' },
    { id: 'website', label: 'Website' },
  ],
  docs: [
    { id: 'privacy', label: 'Privacy Policy' },
    { id: 'terms', label: 'Terms & Conditions' },
    { id: 'refund', label: 'Refund Policy' },
    { id: 'cancellation', label: 'Cancellation Policy' },
    { id: 'shipping', label: 'Parcel & Shipping Policy' },
    { id: 'dmv-compliance', label: 'DMV & Transport Compliance' },
  ],
};

const cleanList = (list, idPattern) => {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    const id = String(item?.id || '').trim().toLowerCase();
    const label = String(item?.label || '').trim().slice(0, 80);
    if (!idPattern.test(id) || !label || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label });
  }
  return out;
};

// Apps (user, driver, website, ...) and document types (privacy, terms, ...) the admin manages.
// Built-in ones always stay; anything the admin adds is kept after them.
const normalizeLegalIndex = (meta) => {
  const apps = cleanList(meta?.apps, /^[a-z0-9]{2,20}$/);
  const docs = cleanList(meta?.docs, /^[a-z0-9][a-z0-9-]{1,39}$/);
  const merge = (defaults, saved) => [
    ...defaults.map((d) => saved.find((s) => s.id === d.id) || d),
    ...saved.filter((s) => !defaults.some((d) => d.id === s.id)),
  ];
  return { apps: merge(DEFAULT_LEGAL_INDEX.apps, apps), docs: merge(DEFAULT_LEGAL_INDEX.docs, docs) };
};

const defaultPageFor = (k) => DEFAULT_PAGES[k] || (k.startsWith('website-') ? DEFAULT_PAGES[k.slice(8)] : null);

const readPage = async (key, { admin = false } = {}) => {
  const k = normalizeKey(key);
  const doc = await PageContent.findOne({ key: k }).lean();
  if (k === 'legal-index') return { key: k, data: normalizeLegalIndex(doc?.meta) };
  if (!doc) {
    if (k === 'landing') return { key: k, data: DEFAULT_LANDING };
    if (k === 'about') {
      return { key: k, data: { appName: 'Kailo Taxi', version: '1.0.0', description: '', logo: '' } };
    }
    return { key: k, data: defaultPageFor(k) || { title: '', content: '' } };
  }
  if (k === 'about') return { key: k, data: normalizeAboutForResponse(doc.about || null) };
  if (k === 'home') return { key: k, data: doc.home || DEFAULT_PAGES.home };
  if (k === 'landing') return { key: k, data: mergeLanding(doc.landing) };

  const legalData = normalizeLegalForResponse(doc.legal || null);
  const flags = { published: legalData?.published !== false, showUpdated: legalData?.showUpdated !== false };
  const { sections, ...visible } = legalData || {};
  const adminExtra = admin ? { sections: Array.isArray(sections) ? sections : undefined } : {};
  // Switched off by the admin: the apps show "not available" instead of any text.
  if (!admin && legalData && !flags.published) {
    return { key: k, data: { title: legalData.title || '', intro: '', content: '', ...flags, unpublished: true } };
  }
  if (!legalData || !legalData.content || !legalData.content.trim()) {
    return {
      key: k,
      data: { ...(defaultPageFor(k) || visible || { title: '', content: '' }), intro: legalData?.intro || '', ...flags, ...adminExtra, updatedAt: doc.updatedAt },
    };
  }
  return { key: k, data: { ...visible, ...flags, ...adminExtra, updatedAt: doc.updatedAt } };
};

export const getPublicPageByKey = (key) => readPage(key);
export const getAdminPageByKey = (key) => readPage(key, { admin: true });

const upsertPage = async (key, fields, updatedBy) =>
  PageContent.findOneAndUpdate(
    { key },
    { $set: { key, ...fields, updatedBy: updatedBy || null, updatedByRole: 'ADMIN' } },
    { upsert: true, new: true },
  ).lean();

export const upsertLegalPage = async (key, payload, updatedBy) => {
  const k = normalizeKey(key);
  if (!isLegalPageKey(k)) {
    throw new ApiError(400, 'Invalid page key');
  }
  const title = String(payload?.title || '').trim();
  const intro = decodeHtmlEntities(String(payload?.intro || '')).trim();
  const content = decodeHtmlEntities(String(payload?.content || '')).trim();

  const published = payload?.published !== false;
  const showUpdated = payload?.showUpdated !== false;
  const sections = Array.isArray(payload?.sections)
    ? payload.sections.slice(0, 100).map((x) => ({
        heading: String(x?.heading || '').slice(0, 200),
        body: String(x?.body || '').slice(0, 20000),
        hidden: !!x?.hidden,
      }))
    : undefined;

  const doc = await upsertPage(k, { legal: { title, intro, content, published, showUpdated, sections } }, updatedBy);
  return { key: k, data: { ...normalizeLegalForResponse(doc?.legal || null), updatedAt: doc?.updatedAt } };
};

export const upsertLegalIndex = async (payload, updatedBy) => {
  const doc = await upsertPage('legal-index', { meta: normalizeLegalIndex(payload) }, updatedBy);
  return { key: 'legal-index', data: normalizeLegalIndex(doc?.meta) };
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

// Saved landing content wins; any section the admin has not touched falls back to defaults.
const mergeLanding = (saved) => {
  const base = JSON.parse(JSON.stringify(DEFAULT_LANDING));
  if (!saved || typeof saved !== 'object') return base;
  const out = { ...base };
  // Content saved before the redesign used a different shape for these sections, so defaults win until re-saved.
  const savedVersion = Number(saved.layoutVersion || 0);
  const stale = savedVersion < 2;
  for (const [section, value] of Object.entries(saved)) {
    if (stale && ['header', 'about', 'footer'].includes(section)) continue;
    // Version 5 rewrote the wording of these sections; older saved copies are replaced by the new defaults.
    if (savedVersion < 9 && ['services', 'howItWorks'].includes(section)) continue;
    // Version 10 added airport, hotel and bus booking to the About text and cards.
    if (savedVersion < 10 && section === 'about') continue;
    // Version 12 replaced the single FAQ list with three folders (Rider, Driver, Fleet owner).
    if (savedVersion < 12 && section === 'faq') continue;
    const baseValue = base[section];
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    if (isObj(value) && isObj(baseValue)) out[section] = { ...baseValue, ...value };
    else if (value !== undefined && value !== null) out[section] = value;
  }
  // Hero slides saved before version 4 get the flight, hotel and movers slides added or refreshed once (admin can delete them afterwards).
  if (savedVersion < 9 && Array.isArray(out.hero?.slides)) {
    const fresh = new Map(NEW_SLIDES.map((x) => [x.key, x]));
    const kept = out.hero.slides.map((x) => (fresh.has(x?.key) ? { ...fresh.get(x.key), ...(x.image ? { image: x.image } : {}) } : x));
    const have = new Set(kept.map((x) => x?.key));
    out.hero = { ...out.hero, slides: [...kept, ...NEW_SLIDES.filter((x) => !have.has(x.key))] };
  }
  // Version 10: the hero subtitle mentions every booking type, and the "Bike & Auto" slide becomes two slides with their own pictures.
  if (savedVersion < 10 && out.hero) {
    const slides = Array.isArray(out.hero.slides) ? out.hero.slides : [];
    const [bike, auto] = BIKE_AUTO_SLIDES;
    const next = [];
    for (const s of slides) {
      if (s?.key === 'bike') {
        next.push({ ...bike, ...(s.image ? { image: s.image } : {}), ...(s.background ? { background: s.background } : {}) });
        if (!slides.some((x) => x?.key === 'auto')) next.push({ ...auto });
      } else next.push(s);
    }
    if (!next.some((x) => x?.key === 'bike')) next.splice(Math.min(1, next.length), 0, { ...bike }, { ...auto });
    out.hero = { ...out.hero, subtitle: base.hero.subtitle, slides: next };
  }
  // Version 11: bus, hotel and flight slides say that booking and a ride are both available in the app.
  if (savedVersion < 11 && Array.isArray(out.hero?.slides)) {
    const fresh = new Map([...NEW_SLIDES, ...base.hero.slides.filter((x) => x.key === 'bus')].map((x) => [x.key, x]));
    out.hero = {
      ...out.hero,
      slides: out.hero.slides.map((x) => {
        const f = fresh.get(x?.key);
        if (!f) return x;
        return { ...f, ...(x.image ? { image: x.image } : {}), ...(x.image2 ? { image2: x.image2 } : {}), ...(x.video ? { video: x.video } : {}), ...(x.background ? { background: x.background } : {}) };
      }),
    };
  }
  out.layoutVersion = base.layoutVersion;
  return out;
};

export const upsertLandingPage = async (payload, updatedBy) => {
  const landing = payload?.landing || payload || {};
  if (typeof landing !== 'object' || Array.isArray(landing)) throw new ApiError(400, 'Invalid landing content');
  const doc = await upsertPage('landing', { landing }, updatedBy);
  return { key: 'landing', data: mergeLanding(doc?.landing) };
};

export const upsertHomePage = async (payload, updatedBy) => {
  const homeData = payload?.home || payload || {};
  const doc = await upsertPage('home', { home: homeData }, updatedBy);
  return { key: 'home', data: doc?.home || homeData };
};
