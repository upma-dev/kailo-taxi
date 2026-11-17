import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, Clock, IndianRupee, Loader2, MapPin, Phone, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { getServiceCenterQuoteRequests, updateServiceCenterQuoteRequest } from '../services/registrationService';

const unwrap = (response) => response?.data?.data || response?.data || response || {};

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100';

const STATUS_VIEW = {
  pending: { label: 'New', cls: 'bg-amber-50 text-amber-700' },
  reviewing: { label: 'Reviewing', cls: 'bg-sky-50 text-sky-700' },
  quoted: { label: 'Quote sent', cls: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rejected', cls: 'bg-rose-50 text-rose-700' },
};

const FILTERS = [
  { key: 'open', label: 'Open', match: (s) => s === 'pending' || s === 'reviewing' },
  { key: 'done', label: 'Answered', match: (s) => s === 'quoted' || s === 'rejected' },
  { key: 'all', label: 'All', match: () => true },
];

const ROLE_LABEL = { admin: 'Admin', service_center: 'Service center', service_center_staff: 'Staff' };

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Not set';

// Custom quote requests of this service center. The owner sees all of them and can hand one to a staff member;
// a staff member sees the ones handed to them. Either can send a quote or reject.
const ServiceCenterQuotesPanel = ({ isStaffUser = false }) => {
  const [items, setItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [canAssign, setCanAssign] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [openId, setOpenId] = useState('');
  const [savingId, setSavingId] = useState('');
  const [drafts, setDrafts] = useState({});

  const load = useCallback(async () => {
    try {
      const data = unwrap(await getServiceCenterQuoteRequests());
      setItems(Array.isArray(data.results) ? data.results : []);
      setStaff(Array.isArray(data.staff) ? data.staff : []);
      setCanAssign(Boolean(data.permissions?.canAssign));
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not load quote requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // New requests arrive while the page is open.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const counts = useMemo(() => {
    const result = {};
    FILTERS.forEach((f) => {
      result[f.key] = items.filter((item) => f.match(item.status)).length;
    });
    return result;
  }, [items]);

  const visible = useMemo(() => {
    const active = FILTERS.find((f) => f.key === filter) || FILTERS[0];
    return items.filter((item) => active.match(item.status));
  }, [items, filter]);

  const draftFor = (item) =>
    drafts[item.id] || { amount: item.quotedAmount > 0 ? String(item.quotedAmount) : '', note: item.note || '', staffId: item.assignedStaff?.id || '' };
  const setDraft = (item, patch) => setDrafts((current) => ({ ...current, [item.id]: { ...draftFor(item), ...patch } }));

  const save = async (item, body, doneMessage) => {
    setSavingId(item.id);
    try {
      const updated = unwrap(await updateServiceCenterQuoteRequest(item.id, body));
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, ...updated } : row)));
      setDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      toast.success(doneMessage);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not save.');
    } finally {
      setSavingId('');
    }
  };

  const respond = (item, status) => {
    const draft = draftFor(item);
    const amount = Number(draft.amount || 0);
    const note = String(draft.note || '').trim();
    if (status === 'quoted' && !(amount > 0)) return toast.error('Enter the quote amount first.');
    if (status === 'rejected' && !note) return toast.error('Write a short reason for the customer.');
    save(
      item,
      { status, quotedAmount: status === 'quoted' ? amount : 0, note },
      status === 'quoted' ? 'Quote sent to the customer' : status === 'rejected' ? 'Request rejected' : 'Marked as reviewing',
    );
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900">Custom quote requests</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          {isStaffUser
            ? 'Requests handed to you. Send the customer a price, or reject with a reason.'
            : 'Requests for your center. Send a price yourself, or hand a request to one of your staff.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
              filter === f.key ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {f.label} <span className="ml-1 opacity-70">{counts[f.key] || 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-400">
          <Loader2 size={18} className="animate-spin" /> Loading requests...
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-400">
          {isStaffUser && filter === 'open' ? 'No requests have been handed to you yet.' : 'No requests in this list.'}
        </div>
      ) : (
        visible.map((item) => {
          const view = STATUS_VIEW[item.status] || STATUS_VIEW.pending;
          const isOpen = openId === item.id;
          const draft = draftFor(item);
          const saving = savingId === item.id;
          return (
            <div key={item.id} className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
              <button type="button" onClick={() => setOpenId(isOpen ? '' : item.id)} className="flex w-full items-center gap-3 px-4 py-4 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-black text-slate-900">{item.vehicleName || 'Rental vehicle'}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${view.cls}`}>{view.label}</span>
                    {item.serviceMode === 'with_driver' ? (
                      <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">With driver</span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                    {item.contactName || 'Customer'} - {Number(item.requestedHours || 0) > 0 ? `${item.requestedHours} hr` : 'Hours not set'}
                    {item.assignedStaff?.name ? ` - ${item.assignedStaff.name}` : ''}
                  </p>
                </div>
                <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen ? (
                <div className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-4">
                  <div className="grid gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-2">
                    <p className="flex items-center gap-2"><UserRound size={14} className="text-slate-400" />{item.contactName || 'Customer'}</p>
                    <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" />{item.contactPhone || 'No phone'}</p>
                    <p className="flex items-center gap-2"><CalendarDays size={14} className="text-slate-400" />Pickup: {formatDateTime(item.pickupDateTime)}</p>
                    <p className="flex items-center gap-2"><CalendarDays size={14} className="text-slate-400" />Return: {formatDateTime(item.returnDateTime)}</p>
                    <p className="flex items-center gap-2"><Clock size={14} className="text-slate-400" />{Number(item.requestedHours || 0)} hr, {item.seatsNeeded} seat(s), {item.luggageNeeded} bag(s)</p>
                    {item.pickupLocation ? <p className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />Pickup: {item.pickupLocation}</p> : null}
                    {item.dropLocation ? <p className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />Drop: {item.dropLocation}</p> : null}
                  </div>
                  {item.specialRequirements ? (
                    <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">Requirements: {item.specialRequirements}</p>
                  ) : null}
                  {item.respondedByRole ? (
                    <p className="text-xs font-semibold text-slate-400">
                      Last answered by {ROLE_LABEL[item.respondedByRole] || item.respondedByRole}
                      {item.respondedByName && item.respondedByRole !== 'admin' ? ` (${item.respondedByName})` : ''}
                    </p>
                  ) : null}

                  {canAssign ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <select value={draft.staffId} onChange={(event) => setDraft(item, { staffId: event.target.value })} className={inputClass}>
                        <option value="">Handled by the center (no staff)</option>
                        {staff.map((member) => (
                          <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={saving || draft.staffId === (item.assignedStaff?.id || '')}
                        onClick={() => save(item, { assignedStaffId: draft.staffId }, draft.staffId ? 'Request handed to staff' : 'Staff removed from the request')}
                        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
                      >
                        Assign
                      </button>
                    </div>
                  ) : null}

                  <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
                    <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                      <div className="relative">
                        <IndianRupee size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
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
                        rows="2"
                        value={draft.note}
                        onChange={(event) => setDraft(item, { note: event.target.value })}
                        className={inputClass}
                        placeholder="Message for the customer"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={saving} onClick={() => respond(item, 'quoted')} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                        {saving ? 'Saving...' : 'Send quote'}
                      </button>
                      <button type="button" disabled={saving} onClick={() => respond(item, 'rejected')} className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                        Reject
                      </button>
                      {item.status === 'pending' ? (
                        <button type="button" disabled={saving} onClick={() => respond(item, 'reviewing')} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 disabled:opacity-60">
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
    </section>
  );
};

export default ServiceCenterQuotesPanel;
