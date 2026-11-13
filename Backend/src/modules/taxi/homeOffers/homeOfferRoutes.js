import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ApiError } from '../../../utils/ApiError.js';

// Home screen offer cards, managed by the admin (Admin -> App Customization -> Home Offers).
// The services shown on the home (Parcel, Bus, Outstation ...) are NOT managed here: they come from the
// admin's App Modules and Vehicle Types.

const ok = (res, data) => res.json({ success: true, data });

// Small key/value flags for this module (for example "starter cards were already created").
const homeMetaSchema = new mongoose.Schema({ key: { type: String, required: true, unique: true } }, { timestamps: true });
const HomeMeta = mongoose.models.TaxiHomeMeta || mongoose.model('TaxiHomeMeta', homeMetaSchema);

const isValidImage = (value) => value === '' || /^https?:\/\//i.test(value) || value.startsWith('/');

export const homeOffersRouter = Router();

const admin = authenticate(['admin']);

// ---------------------------------------------------------------------------------------------
// Offer cards: promotional cards the admin puts on the user home (where "Choose your ride" used to be).
// Same fields as the login banners, so the app renders them with the same card component.
// ---------------------------------------------------------------------------------------------
const PLACEMENTS = ['top', 'spotlight'];
const THEMES = ['brand', 'emerald', 'navy', 'orange', 'purple', 'teal', 'rose'];

const homeOfferSchema = new mongoose.Schema({
  tag: { type: String, default: '' },
  code: { type: String, default: '' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  theme: { type: String, default: 'brand' },
  image: { type: String, default: '' },
  link: { type: String, default: '' },
  // Text of the button on the card (shown when the card has a link).
  cta: { type: String, default: '' },
  // 'top' = below Our Services, 'spotlight' = the larger card deck lower on the home.
  placement: { type: String, enum: ['top', 'spotlight'], default: 'top' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const HomeOffer = mongoose.models.TaxiHomeOffer || mongoose.model('TaxiHomeOffer', homeOfferSchema);

const OFFER_TEXT = { tag: 30, code: 30, title: 80, subtitle: 140, cta: 30 };

const isValidLink = (value) => value === '' || value.startsWith('/') || /^https?:\/\//i.test(value);

const cleanOffer = (body = {}, existing = {}) => {
  const out = {};
  Object.entries(OFFER_TEXT).forEach(([field, max]) => {
    if (body[field] !== undefined) out[field] = String(body[field] ?? '').trim().slice(0, max);
  });
  if (body.theme !== undefined) out.theme = THEMES.includes(body.theme) ? body.theme : 'brand';
  ['image', 'link'].forEach((field) => {
    if (body[field] !== undefined) {
      const value = String(body[field] ?? '').trim();
      if (field === 'image' ? !isValidImage(value) : !isValidLink(value)) {
        throw new ApiError(400, field === 'image' ? 'Image must be an uploaded file or an https link' : 'Link must be an app page (starting with /) or an https link');
      }
      out[field] = value;
    }
  });
  if (body.placement !== undefined) out.placement = PLACEMENTS.includes(body.placement) ? body.placement : 'top';
  if (body.active !== undefined) out.active = Boolean(body.active);
  if (body.order !== undefined) out.order = Number(body.order) || 0;
  if ((out.title ?? existing.title ?? '') === '') throw new ApiError(400, 'Title is required');
  return out;
};

// Starter cards (no made-up discounts), so the home is not empty on day one. Seeded once: a marker is
// stored so cards the admin deletes later never come back.
const STARTER_OFFERS = [
  { tag: 'WELCOME', title: 'Welcome to Kailo Taxi', subtitle: 'Bike, auto and cab rides in a few taps.', theme: 'brand', link: '/taxi/user/ride/select-location', cta: 'Book a ride' },
  { tag: 'SAFE RIDES', title: 'Verified drivers, every trip', subtitle: 'Share your live trip with family for extra safety.', theme: 'navy', link: '' },
  { tag: 'OUTSTATION', title: 'Outstation trips made easy', subtitle: 'Book one-way or round trips with a single tap.', theme: 'orange', link: '/taxi/user/intercity', cta: 'Plan a trip' },
  { tag: 'PARCEL', title: 'Send parcels in minutes', subtitle: 'Secure OTP handover and live tracking.', theme: 'purple', link: '/taxi/user/parcel/type', cta: 'Send parcel' },
  { tag: 'POOLING', title: 'Share the ride, split the fare', subtitle: 'Travel with people going your way and save more.', theme: 'teal', link: '/taxi/user/pooling', cta: 'Find a pool' },
];
const SEED_MARKER_KEY = '__offers_seeded';

const seedOnce = async (markerKey, seed) => {
  if (await HomeMeta.exists({ key: markerKey })) return;
  // The marker is created first, so two requests at once cannot both seed.
  try {
    await HomeMeta.create({ key: markerKey });
  } catch {
    return;
  }
  await seed();
};

const ensureOffersSeeded = async () => {
  await seedOnce(SEED_MARKER_KEY, async () => {
    if ((await HomeOffer.countDocuments({ placement: { $ne: 'spotlight' } })) === 0) {
      await HomeOffer.insertMany(STARTER_OFFERS.map((offer, order) => ({ ...offer, placement: 'top', order })));
    }
  });
};

// The starter cards get a picture (and a button text) once, so they look like the banner style from the start.
// Only cards that still have none of their own are touched, and only once.
const STARTER_OFFER_ART = {
  'Welcome to Kailo Taxi': { image: '/api/v1/static/vehicle-art/cab.png' },
  'Verified drivers, every trip': { image: '/api/v1/static/vehicle-art/taxi.png' },
  'Outstation trips made easy': { image: '/api/v1/static/vehicle-art/cab.png' },
  'Send parcels in minutes': { image: '/api/v1/static/vehicle-art/gift.png' },
  'Share the ride, split the fare': { image: '/api/v1/static/vehicle-art/taxi.png' },
};

const ensureStarterOfferArt = async () => {
  const cards = await HomeOffer.find({ title: { $in: Object.keys(STARTER_OFFER_ART) } }).select('title image cta link').lean();
  for (const card of cards) {
    try {
      await HomeMeta.create({ key: `offer_art:${card._id}` });
    } catch {
      continue; // done before
    }
    const starter = STARTER_OFFERS.find((item) => item.title === card.title);
    const update = {};
    if (!card.image) update.image = STARTER_OFFER_ART[card.title].image;
    if (!card.cta && card.link && starter?.cta) update.cta = starter.cta;
    if (Object.keys(update).length) await HomeOffer.updateOne({ _id: card._id }, { $set: update });
  }
};

homeOffersRouter.get('/common/home-offers', asyncHandler(async (_req, res) => {
  await ensureOffersSeeded();
  await ensureStarterOfferArt();
  // Cards saved before placements existed have none, and count as 'top'.
  const placementFilter = _req.query.placement === 'spotlight' ? { placement: 'spotlight' } : { placement: { $ne: 'spotlight' } };
  const items = await HomeOffer.find({ active: true, ...placementFilter }).sort({ order: 1, createdAt: 1 }).lean();
  ok(res, { results: items });
}));

homeOffersRouter.get('/admin/home-offers', admin, asyncHandler(async (_req, res) => {
  await ensureOffersSeeded();
  await ensureStarterOfferArt();
  ok(res, { results: await HomeOffer.find().sort({ order: 1, createdAt: 1 }).lean() });
}));

homeOffersRouter.post('/admin/home-offers/reorder', admin, asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  await Promise.all(ids.map((id, order) => HomeOffer.updateOne({ _id: id }, { order })));
  ok(res, { reordered: ids.length });
}));

homeOffersRouter.post('/admin/home-offers', admin, asyncHandler(async (req, res) => {
  const data = cleanOffer(req.body);
  if (data.order === undefined) data.order = await HomeOffer.countDocuments({ placement: data.placement === 'spotlight' ? 'spotlight' : { $ne: 'spotlight' } });
  ok(res, (await HomeOffer.create(data)).toObject());
}));

homeOffersRouter.patch('/admin/home-offers/:id', admin, asyncHandler(async (req, res) => {
  const existing = await HomeOffer.findById(req.params.id).lean();
  if (!existing) throw new ApiError(404, 'Offer card not found');
  const doc = await HomeOffer.findByIdAndUpdate(req.params.id, cleanOffer(req.body, existing), { new: true });
  ok(res, doc.toObject());
}));

homeOffersRouter.delete('/admin/home-offers/:id', admin, asyncHandler(async (req, res) => {
  const deleted = await HomeOffer.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, 'Offer card not found');
  ok(res, { deleted: true });
}));
