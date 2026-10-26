import { Router } from 'express';
import { authenticate } from '../../middlewares/authMiddleware.js';
import { upload } from '../../../../middleware/upload.js';
import {
  getAdminPage,
  getBusinessSettings,
  getPublicPage,
  updateBusinessSettings,
  upsertAdminPage,
} from '../controllers/cmsController.js';
import { getPublicEnv } from '../controllers/publicEnvController.js';

export const cmsRouter = Router();

// Public: CMS pages (About, Home, legal) and branding. No auth required.
cmsRouter.get('/pages/:key', getPublicPage);
cmsRouter.get('/business-settings/public', getBusinessSettings);
cmsRouter.get('/public/env', getPublicEnv);

// Admin
cmsRouter.get('/admin/pages/:key', authenticate(['admin']), getAdminPage);
cmsRouter.put('/admin/pages/:key', authenticate(['admin']), upsertAdminPage);
cmsRouter.get('/admin/business-settings', authenticate(['admin']), getBusinessSettings);
cmsRouter.patch(
  '/admin/business-settings',
  authenticate(['admin']),
  upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }]),
  updateBusinessSettings,
);
