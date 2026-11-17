import mongoose from 'mongoose';
import { ApiError } from '../../../utils/ApiError.js';
import { ServiceStore } from '../admin/models/ServiceStore.js';
import { User } from '../user/models/User.js';
import { ServiceCenterStaff } from '../admin/models/ServiceCenterStaff.js';
import { RentalDriver, RentalDriverBooking, RentalDriverVehicle } from '../admin/models/DriverRental.js';

// Shared rules for "Rental with Driver": used by the rider app, the admin panel and the service center app.
//
// `actor` says who is acting: { role: 'admin' } or { role: 'service_center' | 'service_center_staff', centerId, staff }.

const isValidId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));
const clean = (value) => String(value ?? '').trim();
const num = (value, min = 0) => Math.max(min, Number(value) || 0);
const idStr = (value) => String(value?._id || value || '');
const phone10 = (value) => String(value || '').replace(/\D/g, '').slice(-10);

export const DRIVER_BOOKING_OPEN_STATUSES = ['pending', 'confirmed', 'assigned'];

// ---------------------------------------------------------------- serializers
export const serializeDriverVehicle = (item = {}, centerNames = new Map()) => ({
  id: idStr(item._id),
  name: item.name || '',
  vehicleCategory: item.vehicleCategory || 'Car',
  image: item.image || '',
  description: item.description || '',
  capacity: Number(item.capacity || 0),
  luggageCapacity: Number(item.luggageCapacity || 0),
  amenities: Array.isArray(item.amenities) ? item.amenities : [],
  packages: (Array.isArray(item.packages) ? item.packages : []).map((pkg) => ({
    id: idStr(pkg._id),
    label: pkg.label || '',
    durationHours: Number(pkg.durationHours || 0),
    kmLimit: Number(pkg.kmLimit || 0),
    price: Number(pkg.price || 0),
    extraHourPrice: Number(pkg.extraHourPrice || 0),
    extraKmPrice: Number(pkg.extraKmPrice || 0),
    active: pkg.active !== false,
  })),
  serviceCenters: (Array.isArray(item.serviceCenterIds) ? item.serviceCenterIds : []).map((center) => ({
    id: idStr(center),
    name: center?.name || centerNames.get(idStr(center)) || '',
  })),
  ownerCenterId: item.ownerCenterId ? idStr(item.ownerCenterId) : '',
  active: item.active !== false && item.status !== 'inactive',
  createdAt: item.createdAt || null,
});

export const serializeDriver = (item = {}) => ({
  id: idStr(item._id),
  serviceCenterId: idStr(item.serviceCenterId),
  serviceCenterName: item.serviceCenterId?.name || '',
  name: item.name || '',
  phone: item.phone || '',
  licenseNumber: item.licenseNumber || '',
  experienceYears: Number(item.experienceYears || 0),
  languages: Array.isArray(item.languages) ? item.languages : [],
  photo: item.photo || '',
  active: item.active !== false && item.status !== 'inactive',
  createdAt: item.createdAt || null,
});

export const serializeDriverBooking = (item = {}, centerNames = new Map()) => ({
  id: idStr(item._id),
  bookingReference: item.bookingReference || '',
  userId: item.userId ? { id: idStr(item.userId), name: item.userId?.name || '', phone: item.userId?.phone || '' } : null,
  driverVehicleId: idStr(item.driverVehicleId),
  vehicleName: item.vehicleName || '',
  vehicleCategory: item.vehicleCategory || '',
  vehicleImage: item.vehicleImage || '',
  selectedPackage: {
    packageId: item.selectedPackage?.packageId || '',
    label: item.selectedPackage?.label || '',
    durationHours: Number(item.selectedPackage?.durationHours || 0),
    kmLimit: Number(item.selectedPackage?.kmLimit || 0),
    price: Number(item.selectedPackage?.price || 0),
    extraHourPrice: Number(item.selectedPackage?.extraHourPrice || 0),
    extraKmPrice: Number(item.selectedPackage?.extraKmPrice || 0),
  },
  totalCost: Number(item.totalCost || 0),
  pickupDateTime: item.pickupDateTime || null,
  pickupLocation: item.pickupLocation || '',
  dropLocation: item.dropLocation || '',
  notes: item.notes || '',
  contactName: item.contactName || '',
  contactPhone: item.contactPhone || '',
  status: item.status || 'pending',
  serviceCenters: (Array.isArray(item.serviceCenterIds) ? item.serviceCenterIds : []).map((center) => ({
    id: idStr(center),
    name: center?.name || centerNames.get(idStr(center)) || '',
  })),
  assignedStaff: { id: item.assignedStaffId ? idStr(item.assignedStaffId) : '', name: item.assignedStaffName || '', phone: item.assignedStaffPhone || '' },
  assignedDriver: { id: item.assignedDriverId ? idStr(item.assignedDriverId) : '', name: item.assignedDriverName || '', phone: item.assignedDriverPhone || '' },
  note: item.note || '',
  cancelReason: item.cancelReason || '',
  returnRequestedAt: item.returnRequestedAt || null,
  updatedByRole: item.updatedByRole || '',
  createdAt: item.createdAt || null,
  updatedAt: item.updatedAt || null,
});

// ---------------------------------------------------------------- access
const isAdmin = (actor) => actor?.role === 'admin';
const centerOf = (actor) => (actor?.centerId ? idStr(actor.centerId) : '');

const assertCenterOwnerOrAdmin = (actor) => {
  if (isAdmin(actor)) return;
  if (actor?.role !== 'service_center') {
    throw new ApiError(403, 'Only the service center owner can do this');
  }
};

// ---------------------------------------------------------------- vehicles and packages
const normalizePackages = (raw) => {
  const list = Array.isArray(raw) ? raw : [];
  const packages = list
    .map((pkg) => ({
      ...(isValidId(pkg?.id || pkg?._id) ? { _id: pkg.id || pkg._id } : {}),
      label: clean(pkg?.label),
      durationHours: num(pkg?.durationHours),
      kmLimit: num(pkg?.kmLimit),
      price: num(pkg?.price),
      extraHourPrice: num(pkg?.extraHourPrice),
      extraKmPrice: num(pkg?.extraKmPrice),
      active: pkg?.active !== false,
    }))
    .filter((pkg) => pkg.label || pkg.price > 0);
  packages.forEach((pkg) => {
    if (!pkg.label) throw new ApiError(400, 'Every package needs a name');
    if (!(pkg.price > 0)) throw new ApiError(400, `Enter a price for the package "${pkg.label}"`);
  });
  return packages;
};

export const listDriverVehicles = async (actor) => {
  const filter = isAdmin(actor) ? {} : { serviceCenterIds: centerOf(actor) };
  const items = await RentalDriverVehicle.find(filter)
    .populate({ path: 'serviceCenterIds', model: ServiceStore, select: 'name' })
    .sort({ createdAt: -1 })
    .lean();
  return items.map((item) => serializeDriverVehicle(item));
};

export const saveDriverVehicle = async (id, payload = {}, actor) => {
  assertCenterOwnerOrAdmin(actor);
  let item = null;
  if (id) {
    item = isValidId(id) ? await RentalDriverVehicle.findById(id) : null;
    if (!item) throw new ApiError(404, 'Vehicle not found');
    if (!isAdmin(actor) && idStr(item.ownerCenterId) !== centerOf(actor)) {
      throw new ApiError(403, 'This vehicle is managed by the admin. Ask the admin to change it.');
    }
  } else {
    item = new RentalDriverVehicle({ name: '' });
  }

  if (payload.name !== undefined) {
    const name = clean(payload.name);
    if (!name) throw new ApiError(400, 'Vehicle name is required');
    item.name = name;
  }
  if (!item.name) throw new ApiError(400, 'Vehicle name is required');
  if (payload.vehicleCategory !== undefined) item.vehicleCategory = clean(payload.vehicleCategory) || 'Car';
  if (payload.image !== undefined) item.image = clean(payload.image);
  if (payload.description !== undefined) item.description = clean(payload.description);
  if (payload.capacity !== undefined) item.capacity = num(payload.capacity, 1);
  if (payload.luggageCapacity !== undefined) item.luggageCapacity = num(payload.luggageCapacity);
  if (payload.amenities !== undefined) {
    item.amenities = (Array.isArray(payload.amenities) ? payload.amenities : String(payload.amenities).split(','))
      .map(clean)
      .filter(Boolean);
  }
  if (payload.packages !== undefined) item.packages = normalizePackages(payload.packages);
  if (payload.active !== undefined) {
    item.active = Boolean(payload.active);
    item.status = item.active ? 'active' : 'inactive';
  }

  if (isAdmin(actor)) {
    if (payload.serviceCenterIds !== undefined) {
      const wanted = (Array.isArray(payload.serviceCenterIds) ? payload.serviceCenterIds : []).filter(isValidId);
      const centers = wanted.length ? await ServiceStore.find({ _id: { $in: wanted } }).select('_id').lean() : [];
      item.serviceCenterIds = centers.map((center) => center._id);
    }
  } else if (!id) {
    // A vehicle a center adds is served by that center only.
    item.ownerCenterId = centerOf(actor);
    item.serviceCenterIds = [centerOf(actor)];
  }

  await item.save();
  const saved = await RentalDriverVehicle.findById(item._id)
    .populate({ path: 'serviceCenterIds', model: ServiceStore, select: 'name' })
    .lean();
  return serializeDriverVehicle(saved);
};

export const deleteDriverVehicle = async (id, actor) => {
  assertCenterOwnerOrAdmin(actor);
  const item = isValidId(id) ? await RentalDriverVehicle.findById(id) : null;
  if (!item) throw new ApiError(404, 'Vehicle not found');
  if (!isAdmin(actor) && idStr(item.ownerCenterId) !== centerOf(actor)) {
    throw new ApiError(403, 'This vehicle is managed by the admin. Ask the admin to remove it.');
  }
  if (await RentalDriverBooking.exists({ driverVehicleId: item._id, status: { $in: DRIVER_BOOKING_OPEN_STATUSES } })) {
    throw new ApiError(409, 'This vehicle has open bookings. Finish or cancel them first, or switch the vehicle off.');
  }
  await RentalDriverVehicle.deleteOne({ _id: item._id });
  return true;
};

// ---------------------------------------------------------------- drivers
export const listRentalDrivers = async (actor, { serviceCenterId = '' } = {}) => {
  const filter = isAdmin(actor) ? {} : { serviceCenterId: centerOf(actor) };
  if (isAdmin(actor) && isValidId(serviceCenterId)) filter.serviceCenterId = serviceCenterId;
  const items = await RentalDriver.find(filter)
    .populate({ path: 'serviceCenterId', model: ServiceStore, select: 'name' })
    .sort({ createdAt: -1 })
    .lean();
  return items.map(serializeDriver);
};

export const saveRentalDriver = async (id, payload = {}, actor) => {
  assertCenterOwnerOrAdmin(actor);
  let item = null;
  if (id) {
    item = isValidId(id) ? await RentalDriver.findById(id) : null;
    if (!item) throw new ApiError(404, 'Driver not found');
    if (!isAdmin(actor) && idStr(item.serviceCenterId) !== centerOf(actor)) throw new ApiError(404, 'Driver not found');
  } else {
    item = new RentalDriver({ name: '', phone: '' });
  }

  if (payload.name !== undefined) {
    const name = clean(payload.name);
    if (!name) throw new ApiError(400, 'Driver name is required');
    item.name = name;
  }
  if (payload.phone !== undefined) {
    const phone = phone10(payload.phone);
    if (!/^\d{10}$/.test(phone)) throw new ApiError(400, 'Enter a valid 10-digit phone number');
    item.phone = phone;
  }
  if (isAdmin(actor)) {
    if (payload.serviceCenterId !== undefined || !id) {
      const centerId = clean(payload.serviceCenterId);
      if (!isValidId(centerId) || !(await ServiceStore.exists({ _id: centerId }))) {
        throw new ApiError(400, 'Choose the service center this driver belongs to');
      }
      item.serviceCenterId = centerId;
    }
  } else if (!id) {
    item.serviceCenterId = centerOf(actor);
  }
  if (!item.name) throw new ApiError(400, 'Driver name is required');
  if (!item.phone) throw new ApiError(400, 'Enter a valid 10-digit phone number');
  if (payload.licenseNumber !== undefined) item.licenseNumber = clean(payload.licenseNumber).toUpperCase();
  if (payload.experienceYears !== undefined) item.experienceYears = num(payload.experienceYears);
  if (payload.photo !== undefined) item.photo = clean(payload.photo);
  if (payload.languages !== undefined) {
    item.languages = (Array.isArray(payload.languages) ? payload.languages : String(payload.languages).split(','))
      .map(clean)
      .filter(Boolean);
  }
  if (payload.active !== undefined) {
    item.active = Boolean(payload.active);
    item.status = item.active ? 'active' : 'inactive';
  }

  try {
    await item.save();
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'A driver with this phone number already exists in this center');
    throw error;
  }
  const saved = await RentalDriver.findById(item._id).populate({ path: 'serviceCenterId', model: ServiceStore, select: 'name' }).lean();
  return serializeDriver(saved);
};

export const deleteRentalDriver = async (id, actor) => {
  assertCenterOwnerOrAdmin(actor);
  const item = isValidId(id) ? await RentalDriver.findById(id) : null;
  if (!item || (!isAdmin(actor) && idStr(item.serviceCenterId) !== centerOf(actor))) throw new ApiError(404, 'Driver not found');
  if (await RentalDriverBooking.exists({ assignedDriverId: item._id, status: { $in: DRIVER_BOOKING_OPEN_STATUSES } })) {
    throw new ApiError(409, 'This driver is assigned to an open booking. Reassign it first, or switch the driver off.');
  }
  await RentalDriver.deleteOne({ _id: item._id });
  return true;
};

// ---------------------------------------------------------------- bookings
const bookingQueryFor = (actor) => {
  if (isAdmin(actor)) return {};
  const query = { serviceCenterIds: centerOf(actor) };
  // A staff member sees the bookings handed to them.
  if (actor.role === 'service_center_staff' && actor.staff?._id) query.assignedStaffId = actor.staff._id;
  return query;
};

export const listDriverBookings = async (actor) => {
  const items = await RentalDriverBooking.find(bookingQueryFor(actor))
    .populate({ path: 'userId', model: User, select: 'name phone' })
    .populate({ path: 'serviceCenterIds', model: ServiceStore, select: 'name' })
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();
  return items.map((item) => serializeDriverBooking(item));
};

export const deleteDriverBooking = async (id, actor) => {
  if (!isAdmin(actor)) throw new ApiError(403, 'Only the admin can delete a booking');
  const item = isValidId(id) ? await RentalDriverBooking.findById(id) : null;
  if (!item) throw new ApiError(404, 'Booking not found');
  await RentalDriverBooking.deleteOne({ _id: item._id });
  return true;
};

export const updateDriverBooking = async (id, payload = {}, actor) => {
  const query = { _id: isValidId(id) ? id : null, ...bookingQueryFor(actor) };
  const item = await RentalDriverBooking.findOne(query);
  if (!item) throw new ApiError(404, 'Booking not found');

  // Admin: which centers see the booking.
  if (isAdmin(actor) && payload.serviceCenterIds !== undefined) {
    const wanted = (Array.isArray(payload.serviceCenterIds) ? payload.serviceCenterIds : []).filter(isValidId);
    const centers = wanted.length ? await ServiceStore.find({ _id: { $in: wanted } }).select('_id').lean() : [];
    item.serviceCenterIds = centers.map((center) => center._id);
  }

  // Staff handling the booking: the admin or a center owner chooses.
  if (payload.assignedStaffId !== undefined) {
    if (actor.role === 'service_center_staff') throw new ApiError(403, 'Only the service center owner can assign staff');
    const staffId = clean(payload.assignedStaffId);
    if (!staffId) {
      item.assignedStaffId = null;
      item.assignedStaffName = '';
      item.assignedStaffPhone = '';
    } else {
      const staff = isValidId(staffId) ? await ServiceCenterStaff.findById(staffId).lean() : null;
      if (!staff || staff.active === false) throw new ApiError(404, 'Staff member not found');
      if (!isAdmin(actor) && idStr(staff.serviceCenterId) !== centerOf(actor)) throw new ApiError(404, 'Staff member not found in your service center');
      if (!item.serviceCenterIds.map(idStr).includes(idStr(staff.serviceCenterId))) item.serviceCenterIds.push(staff.serviceCenterId);
      item.assignedStaffId = staff._id;
      item.assignedStaffName = staff.name || '';
      item.assignedStaffPhone = staff.phone || '';
    }
  }

  // The driver who will come with the vehicle: one of the drivers listed under the booking's centers.
  if (payload.assignedDriverId !== undefined) {
    const driverId = clean(payload.assignedDriverId);
    if (!driverId) {
      item.assignedDriverId = null;
      item.assignedDriverName = '';
      item.assignedDriverPhone = '';
    } else {
      const driver = isValidId(driverId) ? await RentalDriver.findById(driverId).lean() : null;
      if (!driver || driver.active === false) throw new ApiError(404, 'Driver not found');
      const allowedCenters = isAdmin(actor) ? item.serviceCenterIds.map(idStr) : [centerOf(actor)];
      if (!allowedCenters.includes(idStr(driver.serviceCenterId))) {
        throw new ApiError(400, 'Choose a driver from the service center handling this booking');
      }
      if (await RentalDriverBooking.exists({ _id: { $ne: item._id }, assignedDriverId: driver._id, status: 'assigned', pickupDateTime: item.pickupDateTime })) {
        throw new ApiError(409, 'This driver is already assigned to another booking at the same time');
      }
      item.assignedDriverId = driver._id;
      item.assignedDriverName = driver.name || '';
      item.assignedDriverPhone = driver.phone || '';
      if (['pending', 'confirmed'].includes(item.status) && payload.status === undefined) item.status = 'assigned';
    }
  }

  if (payload.status !== undefined) {
    const status = clean(payload.status);
    if (!['pending', 'confirmed', 'assigned', 'completed', 'cancelled'].includes(status)) throw new ApiError(400, 'Invalid booking status');
    if (status === 'assigned' && !item.assignedDriverId) throw new ApiError(400, 'Choose a driver before marking the booking as assigned');
    if (status === 'cancelled' && !clean(payload.cancelReason) && !item.cancelReason && payload.note === undefined) {
      throw new ApiError(400, 'Write a short reason for the rider when you cancel');
    }
    item.status = status;
  }
  if (payload.note !== undefined) item.note = clean(payload.note);
  if (payload.cancelReason !== undefined) item.cancelReason = clean(payload.cancelReason);

  item.updatedByRole = actor.role;
  await item.save();

  const saved = await RentalDriverBooking.findById(item._id)
    .populate({ path: 'userId', model: User, select: 'name phone' })
    .populate({ path: 'serviceCenterIds', model: ServiceStore, select: 'name' })
    .lean();
  return serializeDriverBooking(saved);
};

// ---------------------------------------------------------------- rider side
export const listPublicDriverVehicles = async () => {
  const items = await RentalDriverVehicle.find({ active: { $ne: false }, status: { $ne: 'inactive' } })
    .sort({ createdAt: -1 })
    .lean();
  return items
    .map((item) => serializeDriverVehicle({ ...item, packages: (item.packages || []).filter((pkg) => pkg.active !== false) }))
    .filter((item) => item.packages.length > 0)
    .map(({ serviceCenters, ownerCenterId, ...rest }) => rest);
};

export const createDriverBookingForUser = async ({ user, payload = {} }) => {
  const vehicleId = clean(payload.driverVehicleId);
  const vehicle = isValidId(vehicleId) ? await RentalDriverVehicle.findById(vehicleId).lean() : null;
  if (!vehicle || vehicle.active === false || vehicle.status === 'inactive') throw new ApiError(404, 'Vehicle not found');

  const pkg = (vehicle.packages || []).find((item) => idStr(item._id) === clean(payload.packageId) && item.active !== false);
  if (!pkg) throw new ApiError(400, 'Choose a package');

  const pickupDateTime = new Date(payload.pickupDateTime);
  if (Number.isNaN(pickupDateTime.getTime()) || pickupDateTime.getTime() < Date.now() - 5 * 60 * 1000) {
    throw new ApiError(400, 'Choose a pickup time in the future');
  }
  const pickupLocation = clean(payload.pickupLocation);
  if (!pickupLocation) throw new ApiError(400, 'Enter the pickup location');

  const contactName = clean(payload.contactName) || clean(user?.name);
  const contactPhone = phone10(payload.contactPhone || user?.phone);
  if (contactName.length < 2) throw new ApiError(400, 'Contact name is required');
  if (!/^\d{10}$/.test(contactPhone)) throw new ApiError(400, 'A valid contact phone number is required');

  const centers = (vehicle.serviceCenterIds || []).filter(isValidId);
  const activeCenters = centers.length
    ? await ServiceStore.find({ _id: { $in: centers }, active: { $ne: false }, status: { $ne: 'inactive' } }).select('_id').lean()
    : [];

  const bookingReference = `DRV-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const booking = await RentalDriverBooking.create({
    bookingReference,
    userId: user?._id || null,
    driverVehicleId: vehicle._id,
    vehicleName: vehicle.name || '',
    vehicleCategory: vehicle.vehicleCategory || '',
    vehicleImage: vehicle.image || '',
    selectedPackage: {
      packageId: idStr(pkg._id),
      label: pkg.label,
      durationHours: pkg.durationHours,
      kmLimit: pkg.kmLimit,
      price: pkg.price,
      extraHourPrice: pkg.extraHourPrice,
      extraKmPrice: pkg.extraKmPrice,
    },
    totalCost: pkg.price,
    pickupDateTime,
    pickupLocation,
    dropLocation: clean(payload.dropLocation),
    notes: clean(payload.notes),
    contactName,
    contactPhone,
    status: 'pending',
    serviceCenterIds: activeCenters.map((center) => center._id),
  });
  return serializeDriverBooking(booking.toObject());
};

export const listDriverBookingsForUser = async (userId) => {
  if (!isValidId(userId)) return [];
  const items = await RentalDriverBooking.find({ userId }).sort({ createdAt: -1 }).limit(30).lean();
  return items.map((item) => serializeDriverBooking(item));
};

export const cancelDriverBookingForUser = async (userId, id, reason = '') => {
  const item = isValidId(id) && isValidId(userId) ? await RentalDriverBooking.findOne({ _id: id, userId }) : null;
  if (!item) throw new ApiError(404, 'Booking not found');
  if (!['pending', 'confirmed', 'assigned'].includes(item.status)) throw new ApiError(400, 'This booking can no longer be cancelled');
  item.status = 'cancelled';
  item.cancelReason = clean(reason) || 'Cancelled by the rider';
  item.updatedByRole = 'user';
  await item.save();
  return serializeDriverBooking(item.toObject());
};

export const returnDriverBookingForUser = async (userId, id) => {
  const item = isValidId(id) && isValidId(userId) ? await RentalDriverBooking.findOne({ _id: id, userId }) : null;
  if (!item) throw new ApiError(404, 'Booking not found');
  if (item.status !== 'assigned') throw new ApiError(400, 'You can end the trip once the driver is assigned');
  if (!item.returnRequestedAt) {
    item.returnRequestedAt = new Date();
    item.updatedByRole = 'user';
    await item.save();
  }
  return serializeDriverBooking(item.toObject());
};

// Everything the center app needs in one call.
export const getCenterDriverRentalOverview = async (actor) => {
  const [vehicles, drivers, bookings, staff] = await Promise.all([
    listDriverVehicles(actor),
    listRentalDrivers(actor),
    listDriverBookings(actor),
    actor.role === 'service_center'
      ? ServiceCenterStaff.find({ serviceCenterId: centerOf(actor), active: true, status: 'active' }).sort({ name: 1 }).lean()
      : Promise.resolve([]),
  ]);
  return {
    permissions: { canManage: actor.role === 'service_center' },
    vehicles,
    drivers,
    bookings,
    staff: staff.map((item) => ({ id: idStr(item._id), name: item.name || '', phone: item.phone || '' })),
  };
};
