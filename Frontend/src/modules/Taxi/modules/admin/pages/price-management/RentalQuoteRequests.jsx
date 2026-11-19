import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Building2,
  Clock3,
  IndianRupee,
  Luggage,
  Mail,
  MapPin,
  Phone,
  User2,
  Users,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100/60';

const STATUS_VIEW = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700' },
  reviewing: { label: 'Reviewing', cls: 'bg-sky-50 text-sky-700' },
  quoted: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rejected', cls: 'bg-rose-50 text-rose-700' },
};

const FILTERS = [
  { key: 'open', label: 'Open', match: (s) => s === 'pending' || s === 'reviewing' },
  { key: 'quoted', label: 'Approved', match: (s) => s === 'quoted' },
  { key: 'rejected', label: 'Rejected', match: (s) => s === 'rejected' },
  { key: 'all', label: 'All', match: () => true },
];

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })
    : 'Not set';

const MODE_VIEW = {
  with_driver: { label: 'With driver', cls: 'bg-violet-50 text-violet-700' },
  self_drive: { label: 'Self drive', cls: 'bg-slate-100 text-slate-600' },
};

const ROLE_LABEL = { admin: 'Admin', service_center: 'Service center', service_center_staff: 'Center staff' };

const normalizeArray = (payload) =>
  payload?.data?.data?.results ||
  payload?.data?.results ||
  payload?.results ||
  [];

const Detail = ({ icon: Icon, label, children }) => (
  <div className="rounded-2xl bg-slate-50 px-4 py-3">
    <div className="flex items-center gap-2 text-slate-500">
      <Icon size={14} />
      <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
    </div>
    <p className="mt-2 text-sm font-black text-slate-900 break-words">{children}</p>
  </div>
);

const RentalQuoteRequests = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [filter, setFilter] = useState('open');
  const [openId, setOpenId] = useState('');
  // What the admin is typing for each request: { [id]: { amount, note } }
  const [drafts, setDrafts] = useState({});
  // Service centers and their staff, for choosing who sees and handles a request.
  const [centers, setCenters] = useState([]);
  const [staff, setStaff] = useState([]);
  // What the admin chose for each request: { [id]: { centers: [centerId], staffId } }
  const [assignDrafts, setAssignDrafts] = useState({});

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const response = await adminService.getRentalQuoteRequests();
      setItems(normalizeArray(response));
    } catch (error) {
      toast.error(error?.message || 'Could not load rental quote requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    Promise.all([adminService.getServiceStores(), adminService.getServiceCenterStaff()])
      .then(([storeResponse, staffResponse]) => {
        setCenters(normalizeArray(storeResponse).map((row) => ({ id: String(row.id || row._id), name: row.name || 'Service center' })));
        setStaff(normalizeArray(staffResponse));
      })
      .catch(() => {
        // The list still works without them; only the assign controls stay empty.
      });
  }, [load]);

  const assignFor = (item) => {
    const id = String(item.id || item._id);
    return (
      assignDrafts[id] || {
        centers: (item.serviceCenters || []).map((center) => center.id),
        staffId: item.assignedStaff?.id || '',
      }
    );
  };

  const setAssign = (item, patch) => {
    const id = String(item.id || item._id);
    setAssignDrafts((current) => ({ ...current, [id]: { ...assignFor(item), ...patch } }));
  };

  const toggleCenter = (item, centerId) => {
    const current = assignFor(item);
    const next = current.centers.includes(centerId) ? current.centers.filter((value) => value !== centerId) : [...current.centers, centerId];
    // A staff member of a center that was just removed can no longer handle the request.
    const keepStaff = staff.find((member) => member.id === current.staffId && next.includes(member.serviceCenterId));
    setAssign(item, { centers: next, staffId: keepStaff ? current.staffId : '' });
  };

  const saveAssignment = async (item) => {
    const id = String(item.id || item._id);
    const draft = assignFor(item);
    setSavingId(id);
    try {
      const updated = await adminService.updateRentalQuoteRequest(id, {
        serviceCenterIds: draft.centers,
        assignedStaffId: draft.staffId || '',
      });
      const payload = updated?.data?.data || updated?.data || updated;
      setItems((current) => current.map((row) => (String(row.id || row._id) === id ? { ...row, ...payload } : row)));
      setAssignDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      toast.success('Service centers and staff updated');
    } catch (error) {
      toast.error(error?.message || 'Could not update the assignment.');
    } finally {
      setSavingId('');
    }
  };

  const statusOf = (item) => String(item.status || 'pending').toLowerCase();

  const counts = useMemo(() => {
    const result = {};
    FILTERS.forEach((f) => {
      result[f.key] = items.filter((item) => f.match(statusOf(item))).length;
    });
    return result;
  }, [items]);

  const visible = useMemo(() => {
    const active = FILTERS.find((f) => f.key === filter) || FILTERS[0];
    return items.filter((item) => active.match(statusOf(item)));
  }, [items, filter]);

  const draftFor = (item) => {
    const id = String(item.id || item._id);
    return (
      drafts[id] || {
        amount: Number(item.adminQuotedAmount || 0) > 0 ? String(item.adminQuotedAmount) : '',
        note: item.adminNote || '',
      }
    );
  };

  const setDraft = (item, patch) => {
    const id = String(item.id || item._id);
    setDrafts((current) => ({ ...current, [id]: { ...draftFor(item), ...patch } }));
  };

  const respond = async (item, nextStatus) => {
    const id = String(item.id || item._id);
    const draft = draftFor(item);
    const amount = Number(draft.amount || 0);
    const note = String(draft.note || '').trim();

    // The admin sets the price (the user is never asked for it), so an approved quote must carry one.
    if (nextStatus === 'quoted' && !(amount > 0)) {
      toast.error('Enter the quote amount before approving.');
      return;
    }
    if (nextStatus === 'rejected' && !note) {
      toast.error('Write a short reason for the user before rejecting.');
      return;
    }

    setSavingId(id);
    try {
      const updated = await adminService.updateRentalQuoteRequest(id, {
        status: nextStatus,
        adminQuotedAmount: nextStatus === 'quoted' ? amount : 0,
        adminNote: note,
      });
      const payload = updated?.data?.data || updated?.data || updated;
      setItems((current) =>
        current.map((row) => (String(row.id || row._id) === id ? { ...row, ...payload } : row)),
      );
      setDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      window.dispatchEvent(new Event('admin-rental-changed'));
      toast.success(
        nextStatus === 'quoted'
          ? 'Quote approved and sent to the user'
          : nextStatus === 'rejected'
            ? 'Request rejected. The user can see your message'
            : 'Marked as reviewing',
      );
    } catch (error) {
      toast.error(error?.message || 'Could not update rental quote request.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Rental Quote Requests</h1>
        <p className="mt-1 text-sm text-slate-500">
          Open a request, then approve it with a price and a message, or reject it with a reason. The user sees your reply in their app.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
              filter === f.key
                ? 'border-[#2e3c78] bg-[#2e3c78] text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {f.label} <span className="ml-1 opacity-70">{counts[f.key] || 0}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-400">
            Loading rental quote requests...
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-400">
            No requests in this list.
          </div>
        ) : (
          visible.map((item) => {
            const id = String(item.id || item._id);
            const status = statusOf(item);
            const view = STATUS_VIEW[status] || STATUS_VIEW.pending;
            const isOpen = openId === id;
            const draft = draftFor(item);
            const saving = savingId === id;
            const finished = status === 'quoted' || status === 'rejected';

            return (
              <div key={id} className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? '' : id)}
                  className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-left"
                >
                  <div className="min-w-[160px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black text-slate-900">{item.vehicleName || 'Rental Vehicle'}</h2>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${view.cls}`}>
                        {view.label}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${(MODE_VIEW[item.serviceMode] || MODE_VIEW.self_drive).cls}`}>
                        {(MODE_VIEW[item.serviceMode] || MODE_VIEW.self_drive).label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {item.userId?.name || item.contactName || 'Unknown user'} - {item.userId?.phone || item.contactPhone || 'No phone'}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-400">
                      {(item.serviceCenters || []).length > 0
                        ? `${item.serviceCenters.map((center) => center.name).filter(Boolean).join(', ') || 'Service center'}${item.assignedStaff?.name ? ` - handled by ${item.assignedStaff.name}` : ''}`
                        : 'Not sent to any service center'}
                      {item.respondedByRole ? ` - answered by ${ROLE_LABEL[item.respondedByRole] || item.respondedByRole}${item.respondedByName && item.respondedByRole !== 'admin' ? ` (${item.respondedByName})` : ''}` : ''}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-slate-600">
                    <p>{Number(item.requestedHours || 0) > 0 ? `${item.requestedHours} hr` : 'Hours not set'}</p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(item.pickupDateTime)} to {formatDateTime(item.returnDateTime)}
                    </p>
                  </div>
                  <div className="min-w-[110px] text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Quote</p>
                    <p className="text-base font-black text-slate-900">
                      {Number(item.adminQuotedAmount || 0) > 0 ? `Rs ${Number(item.adminQuotedAmount).toFixed(0)}` : '-'}
                    </p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen ? (
                  <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <Detail icon={User2} label="Customer">{item.userId?.name || item.contactName || 'Unknown user'}</Detail>
                      <Detail icon={Phone} label="Phone">{item.userId?.phone || item.contactPhone || 'No phone'}</Detail>
                      <Detail icon={Mail} label="Email">{item.userId?.email || item.contactEmail || 'No email'}</Detail>
                      <Detail icon={Clock3} label="Requested Hours">
                        {Number(item.requestedHours || 0) > 0 ? `${item.requestedHours} hr` : 'Not specified'}
                      </Detail>
                      <Detail icon={Users} label="Seats Needed">
                        {Number(item.seatsNeeded || 0) > 0 ? item.seatsNeeded : 'Not specified'}
                      </Detail>
                      <Detail icon={Luggage} label="Bags Needed">{Number(item.luggageNeeded || 0)}</Detail>
                      <Detail icon={CalendarDays} label="Pickup Time">{formatDateTime(item.pickupDateTime)}</Detail>
                      <Detail icon={CalendarDays} label="Return Time">{formatDateTime(item.returnDateTime)}</Detail>
                    </div>

                    {item.pickupLocation || item.dropLocation || item.specialRequirements ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-slate-700 space-y-2">
                        {item.pickupLocation ? (
                          <p className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />Pickup: {item.pickupLocation}</p>
                        ) : null}
                        {item.dropLocation ? (
                          <p className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />Drop: {item.dropLocation}</p>
                        ) : null}
                        {item.specialRequirements ? <p>Requirements: {item.specialRequirements}</p> : null}
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Building2 size={14} />
                        <p className="text-[10px] font-black uppercase tracking-[0.18em]">Service centers and staff</p>
                      </div>
                      {centers.length === 0 ? (
                        <p className="text-sm font-semibold text-slate-400">No service centers have been added yet.</p>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {centers.map((center) => {
                              const on = assignFor(item).centers.includes(center.id);
                              return (
                                <button
                                  key={center.id}
                                  type="button"
                                  onClick={() => toggleCenter(item, center.id)}
                                  className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                                    on ? 'border-[#2e3c78] bg-[#2e3c78] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                  }`}
                                >
                                  {center.name}
                                </button>
                              );
                            })}
                          </div>
                          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                            <select
                              value={assignFor(item).staffId}
                              onChange={(event) => setAssign(item, { staffId: event.target.value })}
                              className={inputClass}
                            >
                              <option value="">No staff chosen (the center handles it)</option>
                              {staff
                                .filter((member) => member.active && assignFor(item).centers.includes(member.serviceCenterId))
                                .map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.name} - {member.serviceCenterName || 'Service center'}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => saveAssignment(item)}
                              className="rounded-xl bg-[#2e3c78] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#25316a] disabled:opacity-60"
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                          <p className="text-[11px] font-semibold text-slate-400">
                            The chosen centers see this request in their app. A staff member sees it only when it is handed to them.
                          </p>
                        </>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        {finished ? 'Your reply (you can still update it)' : 'Reply to the user'}
                      </p>
                      <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                        <div className="relative">
                          <IndianRupee size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            min="0"
                            value={draft.amount}
                            onChange={(event) => setDraft(item, { amount: event.target.value })}
                            className={`${inputClass} pl-10`}
                            placeholder="Quote amount"
                          />
                        </div>
                        <textarea
                          rows="3"
                          value={draft.note}
                          onChange={(event) => setDraft(item, { note: event.target.value })}
                          className={inputClass}
                          placeholder="Message for the user (price details, or the reason if you reject)"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => respond(item, 'quoted')}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <CheckCircle2 size={16} /> {saving ? 'Saving...' : 'Approve & send quote'}
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => respond(item, 'rejected')}
                          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                        >
                          <XCircle size={16} /> Reject
                        </button>
                        {!finished && status !== 'reviewing' ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => respond(item, 'reviewing')}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 disabled:opacity-60"
                          >
                            Mark as reviewing
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RentalQuoteRequests;
