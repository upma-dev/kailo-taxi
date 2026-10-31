import { asyncHandler } from '../../../../utils/asyncHandler.js';
import { ApiError } from '../../../../utils/ApiError.js';
import { uploadImageBufferDetailed } from '../../../../services/cloudinary.service.js';
import { LandingLead } from '../models/LandingLead.js';

const send = (res, message, data, status = 200) => res.status(status).json({ success: true, message, data });
const STATUSES = ['new', 'contacted', 'closed'];

export const submitLead = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  const phone = String(b.phone || '').replace(/[^\d+]/g, '');
  const email = String(b.email || '').trim();
  if (name.length < 2) throw new ApiError(400, 'Please enter your name');
  if (!/^\+?\d{7,15}$/.test(phone)) throw new ApiError(400, 'Please enter a valid phone number');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Please enter a valid email');

  await LandingLead.create({
    name,
    phone,
    email,
    city: String(b.city || '').trim(),
    role: String(b.role || 'user').trim().toLowerCase(),
    message: String(b.message || '').trim(),
  });
  return send(res, 'Registration received', { ok: true }, 201);
});

export const listLeads = asyncHandler(async (req, res) => {
  const status = String(req.query.status || '').trim();
  const filter = STATUSES.includes(status) ? { status } : {};
  const leads = await LandingLead.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  return send(res, 'Leads fetched', leads);
});

export const updateLead = asyncHandler(async (req, res) => {
  const status = String(req.body?.status || '');
  if (!STATUSES.includes(status)) throw new ApiError(400, 'Invalid status');
  const lead = await LandingLead.findByIdAndUpdate(req.params.id, { status }, { new: true }).lean();
  if (!lead) throw new ApiError(404, 'Lead not found');
  return send(res, 'Lead updated', lead);
});

export const deleteLead = asyncHandler(async (req, res) => {
  await LandingLead.findByIdAndDelete(req.params.id);
  return send(res, 'Lead deleted', { ok: true });
});

export const uploadLandingImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image uploaded');
  if (!/^image\//.test(req.file.mimetype)) throw new ApiError(400, 'Only image files are allowed');
  const result = await uploadImageBufferDetailed(req.file.buffer, 'landing');
  return send(res, 'Image uploaded', { url: result.secure_url });
});
