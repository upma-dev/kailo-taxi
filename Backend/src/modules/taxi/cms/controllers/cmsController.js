import { asyncHandler } from '../../../../utils/asyncHandler.js';
import { ApiError } from '../../../../utils/ApiError.js';
import { uploadImageBufferDetailed } from '../../../../services/cloudinary.service.js';
import { BusinessSettings } from '../models/BusinessSettings.js';
import {
  LEGAL_PAGE_KEYS,
  getAdminPageByKey,
  getPublicPageByKey,
  upsertAboutPage,
  upsertHomePage,
  upsertLegalPage,
} from '../services/pageContentService.js';

const send = (res, message, data) => res.status(200).json({ success: true, message, data });

const parseKey = (req) => String(req.params?.key || '').trim().toLowerCase();

export const getPublicPage = asyncHandler(async (req, res) => {
  let key = parseKey(req);
  const userType = String(req.query?.userType || '').trim().toLowerCase();
  if (userType && ['terms', 'privacy'].includes(key)) {
    const roleKey = `${userType}-${key}`;
    if (LEGAL_PAGE_KEYS.includes(roleKey)) {
      const rolePage = await getPublicPageByKey(roleKey);
      if (rolePage?.data?.content && rolePage.data.content.trim()) key = roleKey;
    }
  }
  const result = await getPublicPageByKey(key);
  return send(res, 'Page fetched successfully', result.data);
});

export const getAdminPage = asyncHandler(async (req, res) => {
  const result = await getAdminPageByKey(parseKey(req));
  return send(res, 'Page fetched successfully', result.data);
});

export const upsertAdminPage = asyncHandler(async (req, res) => {
  const key = parseKey(req);
  const updatedBy = req.auth?.sub || null;

  if (key === 'home') {
    const result = await upsertHomePage(req.body ?? {}, updatedBy);
    return send(res, 'Page updated successfully', result.data);
  }
  if (key === 'about') {
    const result = await upsertAboutPage(req.body ?? {}, updatedBy);
    return send(res, 'Page updated successfully', result.data);
  }
  if (LEGAL_PAGE_KEYS.includes(key)) {
    const result = await upsertLegalPage(key, req.body ?? {}, updatedBy);
    return send(res, 'Page updated successfully', result.data);
  }
  throw new ApiError(400, 'Invalid page key');
});

const DEFAULT_BUSINESS_SETTINGS = {
  companyName: 'Kailo Taxi',
  email: 'admin@kailotaxi.com',
  phone: { countryCode: '+91', number: '' },
};

export const getBusinessSettings = async (_req, res) => {
  try {
    let settings = await BusinessSettings.findOne().lean();
    if (!settings) {
      settings = (await BusinessSettings.create(DEFAULT_BUSINESS_SETTINGS)).toObject();
    }
    return send(res, 'Business settings fetched successfully', settings);
  } catch {
    return send(res, 'Business settings fetched successfully', DEFAULT_BUSINESS_SETTINGS);
  }
};

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;
const APP_COLOR_KEYS = ['admin', 'taxiUser', 'taxiDriver'];

export const updateBusinessSettings = asyncHandler(async (req, res) => {
  const data = req.body.data ? JSON.parse(req.body.data) : {};
  const { companyName, email, phoneCountryCode, phoneNumber, address, state, pincode, region } = data;

  // Validate only the fields that were sent, so a color-only save from Global Settings works.
  if (companyName !== undefined && (!companyName || companyName.trim().length < 2 || companyName.trim().length > 50)) {
    throw new ApiError(400, 'Company name must be between 2 and 50 characters');
  }
  if (email !== undefined && (!email || email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) {
    throw new ApiError(400, 'Invalid email address (max 100 characters)');
  }
  if (phoneNumber !== undefined && (!phoneNumber || !/^\d{7,15}$/.test(phoneNumber.trim()))) {
    throw new ApiError(400, 'Invalid phone number (7-15 digits required)');
  }
  if (address && address.length > 250) throw new ApiError(400, 'Address is too long (max 250 characters)');
  if (state && state.length > 50) throw new ApiError(400, 'State name is too long (max 50 characters)');
  if (pincode && !/^\d{4,10}$/.test(pincode.trim())) throw new ApiError(400, 'Invalid pincode (4-10 digits required)');

  const settings = (await BusinessSettings.findOne()) || new BusinessSettings();

  if (companyName) settings.companyName = companyName;
  if (email) settings.email = email;
  if (phoneCountryCode || phoneNumber) {
    settings.phone = {
      countryCode: phoneCountryCode || settings.phone?.countryCode || '+91',
      number: phoneNumber || settings.phone?.number || '',
    };
  }
  if (address !== undefined) settings.address = address;
  if (state !== undefined) settings.state = state;
  if (pincode !== undefined) settings.pincode = pincode;
  if (region) settings.region = region;

  for (const key of ['themeColor', 'landingThemeColor', 'sidebarTextColor']) {
    if (data[key] === undefined) continue;
    const value = String(data[key] || '').trim();
    if (value && !HEX_COLOR.test(value)) throw new ApiError(400, `Invalid color for ${key} (use #RRGGBB)`);
    settings[key] = value;
  }

  if (data.appColors && typeof data.appColors === 'object') {
    const next = {};
    for (const key of APP_COLOR_KEYS) {
      const entry = data.appColors[key];
      if (!entry) continue;
      const primary = String(entry.primary || '').trim();
      const secondary = String(entry.secondary || '').trim();
      if ((primary && !HEX_COLOR.test(primary)) || (secondary && !HEX_COLOR.test(secondary))) {
        throw new ApiError(400, `Invalid color for ${key} (use #RRGGBB)`);
      }
      next[key] = { primary, secondary };
    }
    settings.appColors = next;
    settings.markModified('appColors');
  }

  if (req.files?.logo?.[0]) {
    const result = await uploadImageBufferDetailed(req.files.logo[0].buffer, 'business/logos');
    settings.logo = { url: result.secure_url, publicId: result.public_id };
  }
  if (req.files?.favicon?.[0]) {
    const result = await uploadImageBufferDetailed(req.files.favicon[0].buffer, 'business/favicons');
    settings.favicon = { url: result.secure_url, publicId: result.public_id };
  }

  await settings.save();
  return send(res, 'Business settings updated successfully', settings);
});
