import { ApiError } from '../../../../utils/ApiError.js';
import { User } from '../models/User.js';
import { emitToAdmins } from '../../services/dispatchService.js';
import {
  cancelDriverBookingForUser,
  createDriverBookingForUser,
  listDriverBookingsForUser,
  listPublicDriverVehicles,
  returnDriverBookingForUser,
} from '../../services/driverRentalService.js';

// Rider app: the "Rental with Driver" catalog, bookings and cancellations.

export const getDriverRentalVehicles = async (_req, res) => {
  res.json({ success: true, data: { results: await listPublicDriverVehicles() } });
};

export const createDriverRentalBooking = async (req, res) => {
  const userId = req.auth?.sub;
  const user = userId ? await User.findById(userId).select('name phone').lean() : null;
  if (!user) throw new ApiError(401, 'Please sign in to book');

  const booking = await createDriverBookingForUser({ user, payload: req.body || {} });

  try {
    emitToAdmins('new_registration_alert', {
      id: `pending_rental_driver_booking:${booking.id}`,
      type: 'rental_driver',
      role: 'rental_driver',
      title: 'New Rental with Driver booking',
      name: `${booking.contactName} - ${booking.vehicleName} (${booking.selectedPackage.label})`,
      phone: booking.contactPhone || '',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Failed to emit driver rental alert to admins:', error?.message);
  }

  res.status(201).json({ success: true, data: booking, message: 'Booking request sent' });
};

export const getMyDriverRentalBookings = async (req, res) => {
  res.json({ success: true, data: { results: await listDriverBookingsForUser(req.auth?.sub) } });
};

export const returnMyDriverRentalBooking = async (req, res) => {
  res.json({ success: true, data: await returnDriverBookingForUser(req.auth?.sub, req.params?.id) });
};

export const cancelMyDriverRentalBooking = async (req, res) => {
  const booking = await cancelDriverBookingForUser(req.auth?.sub, req.params?.id, req.body?.reason);
  res.json({ success: true, data: booking });
};
