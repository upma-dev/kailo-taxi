import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ApiError } from '../../../utils/ApiError.js';
import { LoginBanner, LoginBannerSetting } from './loginBannerModels.js';

export const loginBannersRouter = Router();

const ok = (res, data) => res.json({ success: true, data });
const APPS = ['user', 'partner'];
const THEMES = ['brand', 'emerald', 'navy', 'orange', 'purple', 'teal', 'rose'];

const RECOMMENDED = [
  { app: 'user', tag: 'WELCOME OFFER', code: 'FIRST100', title: 'Flat Rs.100 OFF on your first ride', subtitle: 'Use code FIRST100 at checkout for an instant discount', theme: 'emerald' },
  { app: 'user', tag: 'SAFE RIDES', code: '', title: 'Verified drivers, every trip', subtitle: 'Share your live trip with family for extra safety', theme: 'navy' },
  { app: 'user', tag: 'OUTSTATION', code: '', title: 'Outstation trips made easy', subtitle: 'Book one-way or round trips with a single tap', theme: 'orange' },
  { app: 'partner', tag: 'EARN MORE', code: '', title: 'Drive with Kailo, earn every day', subtitle: 'Fast payouts and zero hidden charges', theme: 'teal' },
  { app: 'partner', tag: 'BONUS', code: '', title: 'Complete rides, get a bonus', subtitle: 'Peak-hour incentives in your zone', theme: 'purple' },
  { app: 'partner', tag: 'GROW', code: '', title: 'Add your car to the fleet', subtitle: 'Owners earn on every trip their vehicles complete', theme: 'navy' },
];

const HEX = /^#([0-9a-fA-F]{6})$/;
const CONFIG_TEXT = ['tagline_user', 'tagline_partner', 'support_text', 'support_label', 'support_link', 'copyright_text'];
const CONFIG_COLORS = ['header_from', 'header_to', 'accent_color'];
const PARTNER_TEXT = CONFIG_TEXT.filter((k) => !k.startsWith('tagline')).map((k) => `partner_${k}`);
const PARTNER_COLORS = CONFIG_COLORS.map((k) => `partner_${k}`);

// Per-app look keys. User app uses the plain key, the partner app uses `partner_<key>`
// and falls back to the plain key when it has not been customised.
const LOOK_KEYS = ['header_from', 'header_to', 'accent_color', 'support_text', 'support_label', 'support_link', 'copyright_text'];

const resolveLook = (settings = {}, app = 'user') => {
  const out = {};
  LOOK_KEYS.forEach((key) => {
    const own = app === 'partner' ? settings[`partner_${key}`] : undefined;
    out[key] = own !== undefined && own !== null && own !== '' ? own : settings[key];
  });
  const ownSupport = app === 'partner' ? settings.partner_show_support : null;
  out.show_support = ownSupport !== undefined && ownSupport !== null ? ownSupport !== false : settings.show_support !== false;
  return out;
};

const pickConfig = (settings = {}, app = 'user') => ({
  ...resolveLook(settings, app),
  tagline_user: settings.tagline_user,
  tagline_partner: settings.tagline_partner,
});

const CONTACT_KEYS = ['contact_heading', 'contact_highlight', 'contact_intro', 'contact_phone', 'contact_email', 'contact_address', 'contact_hours'];

const getSettings = async () => {
  const doc = await LoginBannerSetting.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { upsert: true, new: true },
  );
  return doc.toObject();
};

const clean = (body = {}, existing = {}) => {
  const out = {};
  ['tag', 'code', 'title', 'subtitle', 'image', 'video', 'link'].forEach((k) => {
    if (body[k] !== undefined) out[k] = String(body[k] ?? '').trim();
  });
  if (body.app !== undefined) {
    if (!APPS.includes(body.app)) throw new ApiError(400, 'app must be user or partner');
    out.app = body.app;
  }
  if (body.theme !== undefined) out.theme = THEMES.includes(body.theme) ? body.theme : 'brand';
  if (body.active !== undefined) out.active = Boolean(body.active);
  if (body.order !== undefined) out.order = Number(body.order) || 0;
  if ((out.title ?? existing.title ?? '') === '') throw new ApiError(400, 'Title is required');
  return out;
};

// Public: banners shown above the login form of the user / partner app.
loginBannersRouter.get('/common/login-banners', asyncHandler(async (req, res) => {
  const app = APPS.includes(req.query.app) ? req.query.app : 'user';
  const settings = await getSettings();
  const enabled = app === 'user' ? settings.user_enabled : settings.partner_enabled;
  const items = enabled
    ? await LoginBanner.find({ app, active: true }).sort({ order: 1, createdAt: 1 }).lean()
    : [];
  ok(res, { enabled, results: items, config: pickConfig(settings, app) });
}));

// Public: content of the Contact Us page.
loginBannersRouter.get('/common/contact-page', asyncHandler(async (_req, res) => {
  const settings = await getSettings();
  ok(res, Object.fromEntries(CONTACT_KEYS.map((key) => [key, settings[key]])));
}));

const admin = authenticate(['admin']);

loginBannersRouter.get('/admin/login-banners', admin, asyncHandler(async (_req, res) => {
  const [items, settings] = await Promise.all([
    LoginBanner.find().sort({ order: 1, createdAt: 1 }).lean(),
    getSettings(),
  ]);
  ok(res, { results: items, settings });
}));

loginBannersRouter.patch('/admin/login-banners/settings', admin, asyncHandler(async (req, res) => {
  const update = {};
  if (req.body.user_enabled !== undefined) update.user_enabled = Boolean(req.body.user_enabled);
  if (req.body.partner_enabled !== undefined) update.partner_enabled = Boolean(req.body.partner_enabled);
  [...CONFIG_TEXT, ...PARTNER_TEXT].forEach((key) => {
    if (req.body[key] !== undefined) update[key] = String(req.body[key] ?? '').trim().slice(0, 200);
  });
  [...CONFIG_COLORS, ...PARTNER_COLORS].forEach((key) => {
    if (req.body[key] !== undefined) {
      if (!HEX.test(String(req.body[key]))) throw new ApiError(400, 'Colors must be hex like #0F766E');
      update[key] = String(req.body[key]);
    }
  });
  CONTACT_KEYS.forEach((key) => {
    if (req.body[key] !== undefined) update[key] = String(req.body[key] ?? '').trim().slice(0, key === 'contact_intro' || key === 'contact_hours' || key === 'contact_address' ? 500 : 120);
  });
  if (req.body.show_support !== undefined) update.show_support = Boolean(req.body.show_support);
  if (req.body.partner_show_support !== undefined) update.partner_show_support = Boolean(req.body.partner_show_support);
  await getSettings();
  const doc = await LoginBannerSetting.findOneAndUpdate({ key: 'default' }, update, { new: true });
  // The master switch for an app also turns every banner of that app on / off.
  if (update.user_enabled !== undefined) await LoginBanner.updateMany({ app: 'user' }, { active: update.user_enabled });
  if (update.partner_enabled !== undefined) await LoginBanner.updateMany({ app: 'partner' }, { active: update.partner_enabled });
  ok(res, doc.toObject());
}));

loginBannersRouter.post('/admin/login-banners/seed', admin, asyncHandler(async (_req, res) => {
  if (await LoginBanner.countDocuments()) throw new ApiError(409, 'Banners already exist');
  const docs = await LoginBanner.insertMany(RECOMMENDED.map((b, i) => ({ ...b, order: i })));
  ok(res, { created: docs.length });
}));

loginBannersRouter.post('/admin/login-banners', admin, asyncHandler(async (req, res) => {
  const data = clean(req.body);
  if (!data.app) throw new ApiError(400, 'app is required');
  if (data.order === undefined) data.order = await LoginBanner.countDocuments({ app: data.app });
  ok(res, (await LoginBanner.create(data)).toObject());
}));

loginBannersRouter.post('/admin/login-banners/reorder', admin, asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  await Promise.all(ids.map((id, i) => LoginBanner.updateOne({ _id: id }, { order: i })));
  ok(res, { reordered: ids.length });
}));

loginBannersRouter.patch('/admin/login-banners/:id', admin, asyncHandler(async (req, res) => {
  const existing = await LoginBanner.findById(req.params.id).lean();
  if (!existing) throw new ApiError(404, 'Banner not found');
  const doc = await LoginBanner.findByIdAndUpdate(req.params.id, clean(req.body, existing), { new: true });
  ok(res, doc.toObject());
}));

loginBannersRouter.delete('/admin/login-banners/:id', admin, asyncHandler(async (req, res) => {
  const deleted = await LoginBanner.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, 'Banner not found');
  ok(res, { deleted: true });
}));
