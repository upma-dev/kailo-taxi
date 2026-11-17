import { ApiError } from '../../../../utils/ApiError.js';
import { resolveAuthenticatedServiceCenterAccess } from './driverController.js';
import { listNotificationsFor, markNotificationsRead } from '../../services/centerNotificationService.js';

const accessFor = async (req) => {
  const access = await resolveAuthenticatedServiceCenterAccess(req);
  if (!access?.center?._id) throw new ApiError(403, 'Service center access is required');
  return access;
};

export const getCenterNotifications = async (req, res) => {
  res.json({ success: true, data: await listNotificationsFor(await accessFor(req)) });
};

export const readCenterNotifications = async (req, res) => {
  await markNotificationsRead(await accessFor(req), req.body?.ids);
  res.json({ success: true, data: { ok: true } });
};
