import { asyncHandler } from '../../../../utils/asyncHandler.js';
import {
  deleteDriverBooking,
  deleteDriverVehicle,
  deleteRentalDriver,
  listDriverBookings,
  listDriverVehicles,
  listRentalDrivers,
  saveDriverVehicle,
  saveRentalDriver,
  updateDriverBooking,
} from '../../services/driverRentalService.js';

// Admin panel: manage the "Rental with Driver" vehicles and packages, the listed drivers and the bookings.
const actor = { role: 'admin' };
const ok = (res, data) => res.json({ success: true, data });

export const getAdminDriverVehicles = asyncHandler(async (_req, res) => ok(res, { results: await listDriverVehicles(actor) }));
export const createAdminDriverVehicle = asyncHandler(async (req, res) => ok(res, await saveDriverVehicle(null, req.body, actor)));
export const updateAdminDriverVehicle = asyncHandler(async (req, res) => ok(res, await saveDriverVehicle(req.params.id, req.body, actor)));
export const deleteAdminDriverVehicle = asyncHandler(async (req, res) => {
  await deleteDriverVehicle(req.params.id, actor);
  ok(res, { deleted: true });
});

export const getAdminRentalDrivers = asyncHandler(async (req, res) => ok(res, { results: await listRentalDrivers(actor, req.query) }));
export const createAdminRentalDriver = asyncHandler(async (req, res) => ok(res, await saveRentalDriver(null, req.body, actor)));
export const updateAdminRentalDriver = asyncHandler(async (req, res) => ok(res, await saveRentalDriver(req.params.id, req.body, actor)));
export const deleteAdminRentalDriver = asyncHandler(async (req, res) => {
  await deleteRentalDriver(req.params.id, actor);
  ok(res, { deleted: true });
});

export const getAdminDriverBookings = asyncHandler(async (_req, res) => ok(res, { results: await listDriverBookings(actor) }));
export const updateAdminDriverBooking = asyncHandler(async (req, res) => ok(res, await updateDriverBooking(req.params.id, req.body, actor)));
export const deleteAdminDriverBooking = asyncHandler(async (req, res) => {
  await deleteDriverBooking(req.params.id, actor);
  ok(res, { deleted: true });
});
