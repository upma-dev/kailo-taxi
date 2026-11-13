import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Banknote,
  Calendar,
  ChevronRight,
  CreditCard,
  Clock,
  Filter,
  IndianRupee,
  MapPin,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import DriverBottomNav from '../../shared/components/DriverBottomNav';
import api from '../../../shared/api/axiosInstance';
import { getLocalDriverToken } from '../services/registrationService';

const money = (val) => {
  const amount = Number(val || 0);
  return `Rs ${amount.toFixed(2)}`;
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DriverEarnings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isOwnerPortal = location.pathname.startsWith('/taxi/owner');
  const [period, setPeriod] = useState('today');
  const [tipFilter, setTipFilter] = useState('all'); // 'all', 'online', 'cash'
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [earningsData, setEarningsData] = useState({
    summary: {
      totalTrips: 0,
      totalNetEarnings: 0,
      totalGrossFare: 0,
      totalCommission: 0,
      totalTips: 0,
      onlineTips: 0,
      cashTips: 0,
      onlineEarnings: 0,
      cashEarnings: 0,
    },
    trips: [],
    fromDate: null,
    toDate: null,
  });

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = getLocalDriverToken();
      const params = { period };

      if (period === 'custom_date') {
        params.date = customDate;
      } else if (period === 'custom_range') {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const response = await api.get('/drivers/earnings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params,
      });

      const data = response?.data?.data || response?.data || response || {};
      setEarningsData({
        summary: data.summary || {
          totalTrips: 0,
          totalNetEarnings: 0,
          totalGrossFare: 0,
          totalCommission: 0,
          totalTips: 0,
          onlineTips: 0,
          cashTips: 0,
          onlineEarnings: 0,
          cashEarnings: 0,
        },
        trips: Array.isArray(data.trips) ? data.trips : [],
        fromDate: data.fromDate || null,
        toDate: data.toDate || null,
      });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch earnings');
    } finally {
      setLoading(false);
    }
  }, [period, customDate, startDate, endDate]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const FILTER_OPTIONS = [
    { id: 'today', label: 'Today' },
    { id: 'tomorrow', label: 'Tomorrow' },
    { id: 'this_week', label: 'This Week' },
    { id: 'last_week', label: 'Last Week' },
    { id: 'custom_date', label: 'Single Date' },
    { id: 'custom_range', label: 'Custom Interval' },
  ];

  const filteredTrips = earningsData.trips.filter((item) => {
    const tipAmount = Number(item.tip || 0);
    if (tipFilter === 'online') {
      return (Number(item.onlineTip || 0) > 0) || (item.isOnlineTip && tipAmount > 0);
    }
    if (tipFilter === 'cash') {
      return (Number(item.cashTip || 0) > 0) || (!item.isOnlineTip && tipAmount > 0);
    }
    return true;
  });

  const onlineTipTripsCount = earningsData.trips.filter((item) => (Number(item.onlineTip || 0) > 0) || (item.isOnlineTip && Number(item.tip || 0) > 0)).length;
  const cashTipTripsCount = earningsData.trips.filter((item) => (Number(item.cashTip || 0) > 0) || (!item.isOnlineTip && Number(item.tip || 0) > 0)).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-900">
              {isOwnerPortal ? 'Fleet Earnings' : 'My Earnings'}
            </h1>
            <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">
              {isOwnerPortal ? 'Fleet ride income' : 'Ride income'}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchEarnings}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="mx-auto mt-4 max-w-md">
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeriod(opt.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  period === opt.id
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Pickers */}
        <AnimatePresence>
          {period === 'custom_date' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mx-auto mt-3 max-w-md overflow-hidden"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-2.5">
                <Calendar size={16} className="ml-1 shrink-0 text-gray-500" />
                <span className="shrink-0 text-xs font-semibold text-gray-500">Select date</span>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 focus:outline-none"
                />
              </div>
            </motion.div>
          )}

          {period === 'custom_range' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mx-auto mt-3 max-w-md overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-2.5">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 focus:outline-none"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Content Body */}
      <main className="mx-auto max-w-md px-4 pt-5 space-y-4">
        {error && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-700">
            {error}
          </div>
        )}

        {/* Earnings Summary Card */}
        {(() => {
          const summary = earningsData.summary;
          const onlineAmount = Math.max(0, Number(summary.onlineEarnings || 0));
          const cashAmount = Math.max(0, Number(summary.cashEarnings || 0));
          const splitTotal = onlineAmount + cashAmount;
          const onlinePercent = splitTotal > 0 ? Math.round((onlineAmount / splitTotal) * 100) : 0;
          const rangeFrom = formatDateDisplay(earningsData.fromDate);
          const rangeTo = formatDateDisplay(earningsData.toDate);
          const rangeText = rangeFrom && rangeTo ? (rangeFrom === rangeTo ? rangeFrom : `${rangeFrom} - ${rangeTo}`) : '';

          return (
            <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Net income{rangeText ? ` · ${rangeText}` : ''}</p>
                  <h2 className="mt-0.5 text-3xl font-bold tracking-tight text-gray-900">{money(summary.totalNetEarnings)}</h2>
                </div>
                <span className="mt-0.5 shrink-0 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-600">
                  {summary.totalTrips} {summary.totalTrips === 1 ? 'trip' : 'trips'}
                </span>
              </div>

              {/* Online vs cash split */}
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${onlinePercent}%` }} />
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${splitTotal > 0 ? 100 - onlinePercent : 0}%` }} />
              </div>

              <div className="mt-2 divide-y divide-gray-100 text-sm">
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-500">Gross fare</span>
                  <span className="font-semibold text-gray-900">{money(summary.totalGrossFare)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-500">Commission</span>
                  <span className={`font-semibold ${Number(summary.totalCommission) > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                    {Number(summary.totalCommission) > 0 ? '-' : ''}{money(summary.totalCommission)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-2 text-gray-500"><span className="h-2 w-2 rounded-full bg-emerald-500" />Online payout</span>
                  <span className="font-semibold text-emerald-600">{money(summary.onlineEarnings)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-2 text-gray-500"><span className="h-2 w-2 rounded-full bg-amber-400" />Cash collected</span>
                  <span className="font-semibold text-amber-600">{money(summary.cashEarnings)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-gray-500">Tips</span>
                    <p className="text-[10px] font-medium text-gray-400">
                      Online {money(summary.onlineTips)} &middot; Cash {money(summary.cashTips)} (by hand)
                    </p>
                  </div>
                  <span className="font-semibold text-amber-700">+{money(summary.totalTips)}</span>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Tip Filter Scroller Bar */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setTipFilter('all')}
            className={`shrink-0 rounded-2xl px-3.5 py-2 text-[11px] font-black transition-all ${
              tipFilter === 'all'
                ? 'bg-black text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Trips ({earningsData.trips.length})
          </button>
          <button
            type="button"
            onClick={() => setTipFilter('online')}
            className={`shrink-0 rounded-2xl px-3.5 py-2 text-[11px] font-black transition-all flex items-center gap-1.5 ${
              tipFilter === 'online'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span className="inline-flex items-center gap-1"><CreditCard size={12} /> Online tip</span>
            <span className="rounded-full bg-emerald-100/30 px-1.5 py-0.5 text-[9px]">
              {onlineTipTripsCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTipFilter('cash')}
            className={`shrink-0 rounded-2xl px-3.5 py-2 text-[11px] font-black transition-all flex items-center gap-1.5 ${
              tipFilter === 'cash'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'
            }`}
          >
            <span className="inline-flex items-center gap-1"><Banknote size={12} /> Cash tip</span>
            <span className="rounded-full bg-amber-100/30 px-1.5 py-0.5 text-[9px]">
              {cashTipTripsCount}
            </span>
          </button>
        </div>

        {/* Detailed Trips Header */}
        <div className="flex items-center justify-between px-1 pt-1">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              {tipFilter === 'online' ? 'Online Tip Trips' : tipFilter === 'cash' ? 'Cash Tip Trips' : 'Filtered Trips'}
            </h3>
            <p className="text-[11px] font-bold text-slate-500">
              Showing completed rides for selected filter
            </p>
          </div>
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-black text-slate-800">
            {filteredTrips.length}
          </span>
        </div>

        {/* Trips List */}
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw size={24} className="mx-auto animate-spin" />
            <p className="mt-2 text-xs font-bold">Loading earnings...</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-xs">
            <Wallet size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-black text-slate-800">No trips found</p>
            <p className="mt-1 text-xs font-bold text-slate-400">
              {tipFilter === 'online'
                ? 'No trips with online tips in this filter.'
                : tipFilter === 'cash'
                  ? 'No trips with cash tips in this filter.'
                  : 'No completed trips in this selected date filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTrips.map((item) => {
              const tipAmt = Number(item.tip || 0);
              const cashTipAmt = Number(item.cashTip || (!item.isOnlineTip ? tipAmt : 0));
              const onlineTipAmt = Number(item.onlineTip || (item.isOnlineTip ? tipAmt : 0));

              return (
                <div
                  key={item.id}
                  className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-xs hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-xs font-black text-slate-900">{item.customerName}</span>
                      <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-slate-600">
                        {item.serviceType}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-base font-black text-emerald-600 leading-none">
                        +{money(item.netEarnings)}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-bold text-slate-400 capitalize">
                        {item.paymentMethod} payment
                      </span>
                    </div>
                  </div>

                  {/* Tip Badge Indicator */}
                  {tipAmt > 0 && (
                    <div className="mt-2.5 flex items-center gap-2">
                      {onlineTipAmt > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                          💳 +{money(onlineTipAmt)} Online Tip
                        </span>
                      ) : null}
                      {cashTipAmt > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800">
                          💵 +{money(cashTipAmt)} Cash Tip (Hand Collected)
                        </span>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-3 space-y-1.5 text-xs font-bold text-slate-600">
                    <div className="flex items-center gap-2 truncate">
                      <MapPin size={13} className="text-emerald-500 shrink-0" />
                      <span className="truncate">{item.pickupAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <MapPin size={13} className="text-rose-500 shrink-0" />
                      <span className="truncate">{item.dropAddress}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {formatDateDisplay(item.createdAt)}
                    </span>
                    <span>
                      Fare: {money(item.fare)} {item.commission > 0 ? `| Comm: -${money(item.commission)}` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {!isOwnerPortal && <DriverBottomNav activeTab="home" />}
    </div>
  );
};

export default DriverEarnings;
