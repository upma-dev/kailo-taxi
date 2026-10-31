import { PoolingRoute } from '../../admin/models/PoolingRoute.js';
import { PoolingSeatReservation } from '../../admin/models/PoolingSeatReservation.js';
import { asyncHandler } from '../../../../utils/asyncHandler.js';
import { ApiError } from '../../../../utils/ApiError.js';

const ok = (res, data, message) => res.status(200).json({ success: true, data, message });

const toCleanString = (value) => String(value || '').trim();

const normalizeTravelDate = (value) => {
  const rawValue = toCleanString(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue;
  }

  const parsed = new Date(rawValue);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  throw new ApiError(400, 'travelDate must be in YYYY-MM-DD format');
};

export const searchPoolingRoutes = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  const routes = await PoolingRoute.find({
    status: 'active',
    active: { $ne: false },
    $or: [
      { originLabel: { $regex: from || '', $options: 'i' } },
      { destinationLabel: { $regex: to || '', $options: 'i' } },
    ],
  }).populate('assignedVehicleTypeIds');

  return ok(res, routes, 'Routes fetched successfully');
});

export const getPoolingRouteDetails = asyncHandler(async (req, res) => {
  const route = await PoolingRoute.findById(req.params.id).populate('assignedVehicleTypeIds');

  if (!route) {
    throw new ApiError(404, 'Route not found');
  }

  const travelDate = toCleanString(req.query?.travelDate || req.query?.date);
  let seatAvailability = {};

  if (travelDate) {
    const normalizedTravelDate = normalizeTravelDate(travelDate);
    const vehicleIds = (Array.isArray(route.assignedVehicleTypeIds) ? route.assignedVehicleTypeIds : [])
      .map((item) => String(item?._id || item))
      .filter(Boolean);
    const scheduleIds = (Array.isArray(route.schedules) ? route.schedules : [])
      .filter((item) => String(item?.status || 'active') === 'active')
      .map((item) => String(item?.id || ''))
      .filter(Boolean);

    if (vehicleIds.length > 0 && scheduleIds.length > 0) {
      const reservations = await PoolingSeatReservation.find({
        route: route._id,
        vehicle: { $in: vehicleIds },
        scheduleId: { $in: scheduleIds },
        travelDate: normalizedTravelDate,
      })
        .select('vehicle scheduleId seatId')
        .lean();

      seatAvailability = reservations.reduce((accumulator, item) => {
        const key = `${String(item.vehicle)}:${String(item.scheduleId || '')}`;
        accumulator[key] = accumulator[key] || [];
        accumulator[key].push(String(item.seatId || ''));
        return accumulator;
      }, {});
    }
  }

  return ok(
    res,
    {
      ...route.toObject(),
      seatAvailability,
    },
    'Route details fetched successfully',
  );
});
