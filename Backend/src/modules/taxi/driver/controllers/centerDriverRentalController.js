import { ApiError } from '../../../../utils/ApiError.js';
import { resolveAuthenticatedServiceCenterAccess } from './driverController.js';
import {
  deleteDriverVehicle,
  deleteRentalDriver,
  getCenterDriverRentalOverview,
  saveDriverVehicle,
  saveRentalDriver,
  updateDriverBooking,
} from '../../services/driverRentalService.js';

// Service center app: "Rental with Driver" bookings, the center's drivers and its vehicles with packages.
// The owner manages everything; a staff member sees the bookings handed to them and can update those.

const actorFor = async (req) => {
  const access = await resolveAuthenticatedServiceCenterAccess(req);
  if (!access?.center?._id) throw new ApiError(403, 'Service center access is required');
  return { role: access.role, centerId: access.center._id, staff: access.staff };
};

const ok = (res, data) => res.json({ success: true, data });

export const getCenterDriverRentals = async (req, res) => ok(res, await getCenterDriverRentalOverview(await actorFor(req)));
export const createCenterDriverVehicle = async (req, res) => ok(res, await saveDriverVehicle(null, req.body, await actorFor(req)));
export const updateCenterDriverVehicle = async (req, res) => ok(res, await saveDriverVehicle(req.params.id, req.body, await actorFor(req)));
export const deleteCenterDriverVehicle = async (req, res) => {
  await deleteDriverVehicle(req.params.id, await actorFor(req));
  ok(res, { deleted: true });
};
export const createCenterRentalDriver = async (req, res) => ok(res, await saveRentalDriver(null, req.body, await actorFor(req)));
export const updateCenterRentalDriver = async (req, res) => ok(res, await saveRentalDriver(req.params.id, req.body, await actorFor(req)));
export const deleteCenterRentalDriver = async (req, res) => {
  await deleteRentalDriver(req.params.id, await actorFor(req));
  ok(res, { deleted: true });
};
export const updateCenterDriverBooking = async (req, res) => ok(res, await updateDriverBooking(req.params.id, req.body, await actorFor(req)));
