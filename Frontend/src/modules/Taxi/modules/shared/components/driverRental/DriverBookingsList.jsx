import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronDown, Eye, MapPin, Pencil, Phone, Trash2, UserRound, X } from 'lucide-react';
import { inputClass } from './DriverRentalForms';

const STATUS_VIEW = {
  pending: { label: 'New', cls: 'bg-amber-50 text-amber-700' },
  confirmed: { label: 'Confirmed', cls: 'bg-sky-50 text-sky-700' },
  assigned: { label: 'Driver assigned', cls: 'bg-emerald-50 text-emerald-700' },
  completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-600' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700' },
};

const FILTERS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'pending', label: 'Pending', match: (s) => s === 'pending' },
  { key: 'ongoing', label: 'Ongoing', match: (s) => s === 'confirmed' || s === 'assigned' },
  { key: 'completed', label: 'Completed', match: (s) => s === 'completed' },
];

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Not set';

/**
 * Bookings of "Rental with Driver". Used by the admin panel and the service center app.
 *  - drivers: listed drivers (each has serviceCenterId in the admin panel)
 *  - staff:   staff who can handle a booking (hidden when the viewer cannot assign staff)
 *  - centers: given only in the admin panel, so the admin can choose which centers see a booking
 *  - onUpdate(id, payload): returns a promise, the parent saves and refreshes
 */
const DriverBookingsList = ({ bookings, drivers = [], staff = [], centers = null, canAssignStaff = false, onUpdate, onDelete = null, savingId = '', variant = 'cards' }) => {
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState('');
  const [modal, setModal] = useState(null); // { id, edit }
  const [drafts, setDrafts] = useState({});

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, bookings.filter((b) => f.match(b.status)).length])), [bookings]);
  const visible = useMemo(() => bookings.filter((b) => (FILTERS.find((f) => f.key === filter) || FILTERS[0]).match(b.status)), [bookings, filter]);

  const draftFor = (booking) =>
    drafts[booking.id] || {
      driverId: booking.assignedDriver?.id || '',
      staffId: booking.assignedStaff?.id || '',
      centerIds: booking.serviceCenters.map((center) => center.id),
      note: booking.note || '',
    };
  const setDraft = (booking, patch) => setDrafts((current) => ({ ...current, [booking.id]: { ...draftFor(booking), ...patch } }));

  const send = async (booking, status) => {
    const draft = draftFor(booking);
    const payload = { assignedDriverId: draft.driverId, note: draft.note };
    if (canAssignStaff) payload.assignedStaffId = draft.staffId;
    if (centers) payload.serviceCenterIds = draft.centerIds;
    if (status) payload.status = status;
    if (status === 'cancelled') payload.cancelReason = draft.note;
    const ok = await onUpdate(booking.id, payload);
    if (ok) {
      if (variant === 'table') setModal(null);
      setDrafts((current) => {
        const next = { ...current };
        delete next[booking.id];
        return next;
      });
    }
  };

  // Details of one booking, plus the controls to change it (hidden when read-only).
  const renderBody = (booking, canEdit = true) => {
    const draft = draftFor(booking);
    const saving = savingId === booking.id;
    const closed = booking.status === 'completed' || booking.status === 'cancelled';
    // Admin panel: only drivers and staff of the centers chosen for this booking.
    const driverChoices = drivers.filter((driver) => driver.active && (!centers || draft.centerIds.includes(driver.serviceCenterId)));
    const staffChoices = staff.filter((member) => member.active !== false && (!centers || !member.serviceCenterId || draft.centerIds.includes(member.serviceCenterId)));
    return (
  <div className="space-y-4">
    <div className="grid gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-2">
      <p className="flex items-center gap-2"><UserRound size={14} className="text-slate-400" />{booking.contactName}</p>
      <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" />{booking.contactPhone}</p>
      <p className="flex items-center gap-2"><CalendarDays size={14} className="text-slate-400" />Pickup: {formatDateTime(booking.pickupDateTime)}</p>
      <p className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />From: {booking.pickupLocation}</p>
      {booking.dropLocation ? <p className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />To: {booking.dropLocation}</p> : null}
      <p className="text-slate-500">
        Package: {booking.selectedPackage.label}
        {booking.selectedPackage.kmLimit ? ` (${booking.selectedPackage.kmLimit} km)` : ''}
        {booking.selectedPackage.extraHourPrice ? `, extra hour Rs ${booking.selectedPackage.extraHourPrice}` : ''}
        {booking.selectedPackage.extraKmPrice ? `, extra km Rs ${booking.selectedPackage.extraKmPrice}` : ''}
      </p>
    </div>
    {booking.returnRequestedAt && booking.status === 'assigned' ? (
      <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
        The rider says the trip ended on {formatDateTime(booking.returnRequestedAt)}. Check the vehicle, then mark the booking completed.
      </p>
    ) : null}
    {booking.notes ? <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">Rider note: {booking.notes}</p> : null}
    {booking.status === 'cancelled' && booking.cancelReason ? <p className="text-sm font-semibold text-rose-600">Reason: {booking.cancelReason}</p> : null}

    {canEdit && !closed ? (
      <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
        {centers ? (
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Service centers that see this booking</p>
            <div className="flex flex-wrap gap-2">
              {centers.map((center) => {
                const on = draft.centerIds.includes(center.id);
                return (
                  <button
                    key={center.id}
                    type="button"
                    onClick={() => setDraft(booking, { centerIds: on ? draft.centerIds.filter((id) => id !== center.id) : [...draft.centerIds, center.id], driverId: '', staffId: '' })}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    {center.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Driver for this booking</p>
            <select value={draft.driverId} onChange={(event) => setDraft(booking, { driverId: event.target.value })} className={inputClass}>
              <option value="">No driver chosen yet</option>
              {driverChoices.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} - {driver.experienceYears} yrs{driver.serviceCenterName && centers ? ` - ${driver.serviceCenterName}` : ''}
                </option>
              ))}
            </select>
          </div>
          {canAssignStaff ? (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Staff handling it</p>
              <select value={draft.staffId} onChange={(event) => setDraft(booking, { staffId: event.target.value })} className={inputClass}>
                <option value="">Handled by the center</option>
                {staffChoices.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <textarea
          rows="2"
          value={draft.note}
          onChange={(event) => setDraft(booking, { note: event.target.value })}
          className={inputClass}
          placeholder="Message for the rider (also used as the reason if you cancel)"
        />

        {variant === 'table' && booking.status !== 'assigned' && !draft.driverId ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            Choose a driver for this booking first. The booking can be approved only after a driver is assigned.
            {driverChoices.length === 0 ? ' No active driver is listed for the selected service centers yet. Add one under the Drivers tab.' : ''}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={saving} onClick={() => send(booking, '')} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-60">
            Save
          </button>
          {variant === 'table' && booking.status !== 'assigned' ? (
            <button type="button" disabled={saving || !draft.driverId} onClick={() => send(booking, 'assigned')} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              Approve with driver
            </button>
          ) : (
            <>
              {booking.status === 'pending' ? (
                <button type="button" disabled={saving} onClick={() => send(booking, 'confirmed')} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                  Confirm
                </button>
              ) : null}
              {draft.driverId && booking.status !== 'assigned' ? (
                <button type="button" disabled={saving} onClick={() => send(booking, 'assigned')} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                  Confirm with driver
                </button>
              ) : null}
            </>
          )}
          {booking.status === 'assigned' ? (
            <button type="button" disabled={saving} onClick={() => send(booking, 'completed')} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              Mark completed
            </button>
          ) : null}
          <button type="button" disabled={saving} onClick={() => send(booking, 'cancelled')} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            Cancel booking
          </button>
        </div>
      </div>
    ) : null}
  </div>
    );
  };

  const rowOf = (booking) => {
    const view = STATUS_VIEW[booking.status] || STATUS_VIEW.pending;
    return (
      <tr key={booking.id} className="hover:bg-slate-50/60">
        <td className="px-5 py-3 font-bold text-slate-900">{booking.vehicleName}<span className="block text-xs font-semibold text-slate-400">{booking.bookingReference}</span></td>
        <td className="px-5 py-3 font-semibold text-slate-600">{booking.contactName}<span className="block text-xs text-slate-400">{booking.contactPhone}</span></td>
        <td className="px-5 py-3 font-semibold text-slate-600">{booking.selectedPackage.label}<span className="block text-xs text-slate-400">Rs {booking.totalCost}</span></td>
        <td className="px-5 py-3 font-semibold text-slate-600">{formatDateTime(booking.pickupDateTime)}</td>
        <td className="px-5 py-3 font-semibold text-slate-600">{booking.assignedDriver.name || '-'}</td>
        <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${view.cls}`}>{view.label}</span></td>
        <td className="px-5 py-3">
          <div className="flex justify-end gap-2">
            {booking.status === 'pending' ? (
              <button type="button" onClick={() => setModal({ id: booking.id, edit: true })} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white" aria-label="Approve"><CheckCircle2 size={14} /> Approve</button>
            ) : null}
            <button type="button" onClick={() => setModal({ id: booking.id, edit: false })} className="rounded-lg border border-slate-200 p-2 text-slate-500" aria-label="View"><Eye size={15} /></button>
            <button type="button" onClick={() => setModal({ id: booking.id, edit: true })} className="rounded-lg border border-slate-200 p-2 text-slate-500" aria-label="Edit"><Pencil size={15} /></button>
            {onDelete ? <button type="button" onClick={() => onDelete(booking)} className="rounded-lg border border-slate-200 p-2 text-rose-500" aria-label="Delete"><Trash2 size={15} /></button> : null}
          </div>
        </td>
      </tr>
    );
  };

  const modalBooking = modal ? bookings.find((b) => b.id === modal.id) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-4 py-2 text-xs font-bold transition ${filter === f.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            {f.label} <span className="ml-1 opacity-70">{counts[f.key] || 0}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-400">No bookings in this list.</div>
      ) : variant === 'table' ? (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-3">Vehicle</th><th className="px-5 py-3">Rider</th><th className="px-5 py-3">Package</th><th className="px-5 py-3">Pickup</th><th className="px-5 py-3">Driver</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{visible.map(rowOf)}</tbody>
          </table>
        </div>
      ) : (
        visible.map((booking) => {
          const view = STATUS_VIEW[booking.status] || STATUS_VIEW.pending;
          const isOpen = openId === booking.id;
          return (
            <div key={booking.id} className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
              <button type="button" onClick={() => setOpenId(isOpen ? '' : booking.id)} className="flex w-full items-center gap-3 px-4 py-4 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-black text-slate-900">{booking.vehicleName}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${view.cls}`}>{view.label}</span>
                    {booking.returnRequestedAt && booking.status === 'assigned' ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">Trip ended</span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                    {booking.bookingReference} - {booking.selectedPackage.label} - Rs {booking.totalCost}
                  </p>
                  <p className="truncate text-xs font-semibold text-slate-400">
                    {formatDateTime(booking.pickupDateTime)}
                    {booking.assignedDriver.name ? ` - driver ${booking.assignedDriver.name}` : ''}
                    {booking.assignedStaff.name ? ` - staff ${booking.assignedStaff.name}` : ''}
                  </p>
                </div>
                <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen ? (

                <div className="border-t border-slate-100 px-4 pb-4 pt-4">{renderBody(booking)}</div>
              ) : null}
            </div>
          );
        })
      )}

      {modalBooking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setModal(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">{modalBooking.vehicleName}</h3>
                <p className="text-xs font-semibold text-slate-500">
                  {modalBooking.bookingReference} - {modalBooking.selectedPackage.label} - Rs {modalBooking.totalCost} - {(STATUS_VIEW[modalBooking.status] || STATUS_VIEW.pending).label}
                </p>
              </div>
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-200 p-2 text-slate-500" aria-label="Close"><X size={16} /></button>
            </div>
            {renderBody(modalBooking, modal.edit)}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DriverBookingsList;
