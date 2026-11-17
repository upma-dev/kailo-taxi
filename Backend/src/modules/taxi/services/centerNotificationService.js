import mongoose from 'mongoose';
import { ServiceCenterNotification } from '../admin/models/ServiceCenterNotification.js';

// Alerts for service centers and their staff. One rule decides who hears about a request:
//   - the center owner hears about every request of the center
//   - a staff member hears only about the requests handed to them (never about other staff's requests)
// Alerts must never break the request that caused them, so every failure is swallowed.

const isValidId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));
const idStr = (value) => String(value?._id || value || '');

const LABEL = {
  rental_booking: 'rental booking',
  rental_quote: 'quote request',
  driver_booking: 'booking with driver',
};

const describe = (kind, doc) => {
  const vehicle = doc.vehicleName || 'Rental vehicle';
  const who = doc.contactName ? ` from ${doc.contactName}` : '';
  const ref = doc.bookingReference ? ` (${doc.bookingReference})` : '';
  return `${vehicle}${ref}${who}`;
};

const create = async (rows) => {
  const clean = rows.filter((row) => isValidId(row.recipientId) && isValidId(row.refId));
  if (clean.length) await ServiceCenterNotification.insertMany(clean, { ordered: false });
};

const ownerRows = (centerIds, base) =>
  [...new Set((centerIds || []).map(idStr).filter(isValidId))].map((centerId) => ({
    ...base,
    recipientRole: 'service_center',
    recipientId: centerId,
    serviceCenterId: centerId,
  }));

const staffRow = (staffId, centerIds, base) =>
  isValidId(staffId)
    ? [{ ...base, recipientRole: 'service_center_staff', recipientId: idStr(staffId), serviceCenterId: idStr((centerIds || [])[0]) || null }]
    : [];

/** A request just arrived: every linked center's owner hears about it. Staff do not, until it is handed to them. */
export const notifyNewRequest = async (kind, doc) => {
  try {
    const base = { kind, refId: doc._id, event: 'new', title: `New ${LABEL[kind]}`, body: describe(kind, doc) };
    await create(ownerRows(doc.serviceCenterIds, base));
  } catch (error) {
    console.warn('Center alert (new request) failed:', error?.message);
  }
};

/** What changed on a saved request. `ev` comes from the model's save hook. */
export const handleRentalSaved = async (kind, doc, ev = {}) => {
  try {
    const centerIds = doc.serviceCenterIds || [];
    const staffId = doc.assignedStaffId || null;
    const rows = [];

    if (ev.isNew && kind !== 'rental_booking') {
      // (A new self-drive booking is saved by an upsert that skips this hook, so it calls notifyNewRequest itself.)
      await notifyNewRequest(kind, doc);
      return;
    }

    // Handed to a staff member: that staff member hears about it.
    if (ev.staffChanged && staffId) {
      rows.push(...staffRow(staffId, centerIds, { kind, refId: doc._id, event: 'assigned', title: `New ${LABEL[kind]} handed to you`, body: describe(kind, doc) }));
    }

    // The rider brought the vehicle back (self-drive) or says the trip with the driver has ended:
    // the owner and the staff member handling it, nobody else.
    const returned =
      (kind === 'rental_booking' && ev.statusChanged && doc.status === 'end_requested') ||
      (kind === 'driver_booking' && ev.returnRequested && doc.returnRequestedAt);
    if (returned) {
      const base = {
        kind,
        refId: doc._id,
        event: 'returned',
        title: kind === 'driver_booking' ? 'Rider says the trip has ended' : 'Rider is returning the vehicle',
        body: describe(kind, doc),
      };
      rows.push(...ownerRows(centerIds, base), ...staffRow(staffId, centerIds, base));
    }

    // The rider cancelled.
    const cancelledByRider = kind === 'driver_booking' && ev.statusChanged && doc.status === 'cancelled' && doc.updatedByRole === 'user';
    if (cancelledByRider) {
      const base = { kind, refId: doc._id, event: 'cancelled', title: `${LABEL[kind][0].toUpperCase()}${LABEL[kind].slice(1)} cancelled by the rider`, body: describe(kind, doc) };
      rows.push(...ownerRows(centerIds, base), ...staffRow(staffId, centerIds, base));
    }

    await create(rows);
  } catch (error) {
    console.warn('Center alert failed:', error?.message);
  }
};

// ---- what the center app reads
const recipientFilter = (access) =>
  access.role === 'service_center_staff'
    ? { recipientRole: 'service_center_staff', recipientId: access.staff._id }
    : { recipientRole: 'service_center', recipientId: access.center._id };

export const listNotificationsFor = async (access) => {
  const filter = recipientFilter(access);
  const [items, unread] = await Promise.all([
    ServiceCenterNotification.find(filter).sort({ createdAt: -1 }).limit(40).lean(),
    ServiceCenterNotification.countDocuments({ ...filter, readAt: null }),
  ]);
  return {
    unread,
    results: items.map((item) => ({
      id: idStr(item._id),
      kind: item.kind,
      refId: idStr(item.refId),
      event: item.event,
      title: item.title,
      body: item.body,
      read: Boolean(item.readAt),
      createdAt: item.createdAt,
    })),
  };
};

export const markNotificationsRead = async (access, ids = []) => {
  const filter = { ...recipientFilter(access), readAt: null };
  const wanted = (Array.isArray(ids) ? ids : []).filter(isValidId);
  if (wanted.length) filter._id = { $in: wanted };
  await ServiceCenterNotification.updateMany(filter, { $set: { readAt: new Date() } });
};
