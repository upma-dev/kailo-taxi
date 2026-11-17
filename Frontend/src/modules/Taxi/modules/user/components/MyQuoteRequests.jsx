import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, FileText } from 'lucide-react';
import { userService } from '../services/userService';

const STATUS_VIEW = {
  quoted: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  reviewing: { label: 'Under review', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending: { label: 'Waiting for admin', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
};

// The user's own custom rental quote requests with the admin's decision. Renders nothing when there are none,
// so it can be dropped on any page (rental list, home, profile).
const MyQuoteRequests = ({ limit = 3, className = '' }) => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);

  const load = useCallback(async () => {
    try {
      const response = await userService.getMyRentalQuoteRequests();
      const payload = response?.data?.data || response?.data || response || {};
      setQuotes(Array.isArray(payload.results) ? payload.results : []);
    } catch {
      // Not logged in / rental disabled: just show nothing.
      setQuotes([]);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (!quotes.length) return null;

  return (
    <div className={`rounded-[20px] border border-white/80 bg-white/90 px-5 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)] space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <FileText size={14} className="text-slate-400" />
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Your quote requests</p>
      </div>
      {quotes.slice(0, limit).map((quote) => {
        const status = String(quote.status || 'pending').toLowerCase();
        const view = STATUS_VIEW[status] || STATUS_VIEW.pending;
        return (
          <button
            key={quote.id}
            type="button"
            onClick={() => navigate('/taxi/user/rental')}
            className="w-full rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-left space-y-1.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-black text-slate-900">{quote.vehicleName || 'Rental vehicle'}</p>
                <p className="text-[11px] font-semibold text-slate-500">
                  {quote.requestedHours}h
                  {quote.pickupDateTime
                    ? ` - ${new Date(quote.pickupDateTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}`
                    : ''}
                </p>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${view.cls}`}>
                {view.label}
              </span>
            </div>
            {status === 'quoted' && Number(quote.adminQuotedAmount) > 0 ? (
              <p className="text-[13px] font-black text-emerald-700">Quoted price: Rs.{quote.adminQuotedAmount}</p>
            ) : null}
            {quote.adminNote && (status === 'quoted' || status === 'rejected') ? (
              <p className="text-[11px] font-semibold text-slate-500">Admin note: {quote.adminNote}</p>
            ) : null}
          </button>
        );
      })}
      {quotes.length > limit ? (
        <p className="flex items-center justify-end gap-0.5 text-[11px] font-black text-slate-400">
          +{quotes.length - limit} more <ChevronRight size={12} />
        </p>
      ) : null}
    </div>
  );
};

export default MyQuoteRequests;
