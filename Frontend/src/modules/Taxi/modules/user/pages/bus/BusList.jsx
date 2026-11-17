import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  Loader2,
  Star,
  BusFront,
  Sparkles,
  TicketPercent,
  SlidersHorizontal,
  BadgePercent,
} from 'lucide-react';
import userBusService from '../../services/busService';

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Filter & Sort' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'departure-asc', label: 'Early Departure' },
  { id: 'rating-desc', label: 'Top Rated' },
];

const getRoutePrefix = (pathname = '') => (pathname.startsWith('/taxi/user') ? '/taxi/user' : '');

const formatTravelDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
};

const formatDurationBrief = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return 'Direct';
  // A bare number means hours.
  if (/^\d+(\.\d+)?$/.test(raw)) return `${raw}h`;
  return raw
    .replace(/days?/gi, 'd')
    .replace(/hours?/gi, 'h')
    .replace(/hrs?/gi, 'h')
    .replace(/minutes?/gi, 'm')
    .replace(/mins?/gi, 'm')
    .replace(/\s+/g, ' ')
    .trim();
};

const getNumericValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getBusCompany = (bus) =>
  String(bus?.operator || bus?.busName || bus?.travels || bus?.company || '')
    .trim();

const getBusRating = (bus) => getNumericValue(bus?.rating, 0);
const getBusRatingCount = (bus) => getNumericValue(bus?.ratingCount, 0);
const hasBusRating = (bus) => getBusRatingCount(bus) > 0;
const isHighlyRatedBus = (bus) => hasBusRating(bus) && getBusRating(bus) >= 4.5;

const hasBusDeal = (bus) => {
  const searchableText = [
    bus?.cancellationPolicy,
    bus?.offerText,
    bus?.badge,
    Array.isArray(bus?.tags) ? bus.tags.join(' ') : bus?.tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return searchableText.includes('free') || searchableText.includes('deal') || searchableText.includes('save');
};

const getDepartureSortValue = (bus) => {
  const raw = String(bus?.departure || '').trim();
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;

  return (Number(match[1]) * 60) + Number(match[2]);
};

const BusList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routePrefix = useMemo(() => getRoutePrefix(location.pathname), [location.pathname]);
  const state = location.state || {};
  const { fromCity, toCity, date } = state;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buses, setBuses] = useState([]);
  const [sortBy, setSortBy] = useState('recommended');
  const [showDealsOnly, setShowDealsOnly] = useState(false);
  const [showHighlyRatedOnly, setShowHighlyRatedOnly] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);

  useEffect(() => {
    if (!fromCity || !toCity || !date) {
      navigate(`${routePrefix}/bus`, { replace: true });
      return;
    }

    let active = true;

    const loadResults = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await userBusService.searchBuses({ fromCity, toCity, date });
        if (!active) return;
        setBuses(Array.isArray(response?.data?.results) ? response.data.results : []);
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Failed to search buses');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadResults();
    return () => {
      active = false;
    };
  }, [date, fromCity, navigate, routePrefix, toCity]);

  useEffect(() => {
    if (!isSortMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setIsSortMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsSortMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSortMenuOpen]);

  const sortOption = useMemo(
    () => SORT_OPTIONS.find((option) => option.id === sortBy) || SORT_OPTIONS[0],
    [sortBy],
  );

  const busCompanies = useMemo(() => {
    const uniqueCompanies = Array.from(
      new Set(
        (Array.isArray(buses) ? buses : [])
          .map((bus) => getBusCompany(bus))
          .filter(Boolean),
      ),
    );

    return uniqueCompanies.sort((left, right) => left.localeCompare(right));
  }, [buses]);

  const visibleBuses = useMemo(() => {
    const nextBuses = Array.isArray(buses) ? [...buses] : [];
    const filteredBuses = nextBuses.filter((bus) => {
      if (showDealsOnly && !hasBusDeal(bus)) {
        return false;
      }

      if (showHighlyRatedOnly && !isHighlyRatedBus(bus)) {
        return false;
      }

      if (selectedCompany !== 'all' && getBusCompany(bus) !== selectedCompany) {
        return false;
      }

      return true;
    });

    if (sortBy === 'price-asc') {
      filteredBuses.sort(
        (left, right) => getNumericValue(left?.price, Number.MAX_SAFE_INTEGER) - getNumericValue(right?.price, Number.MAX_SAFE_INTEGER),
      );
    } else if (sortBy === 'departure-asc') {
      filteredBuses.sort((left, right) => getDepartureSortValue(left) - getDepartureSortValue(right));
    } else if (sortBy === 'rating-desc') {
      filteredBuses.sort((left, right) => {
        const ratingDelta = getBusRating(right) - getBusRating(left);
        if (ratingDelta !== 0) {
          return ratingDelta;
        }

        return getBusRatingCount(right) - getBusRatingCount(left);
      });
    }

    return filteredBuses;
  }, [buses, selectedCompany, showDealsOnly, showHighlyRatedOnly, sortBy]);

  const handleSelect = (bus) => {
    navigate(`${routePrefix}/bus/details`, {
      state: {
        ...state,
        bus,
      },
    });
  };

  const handleSortSelect = (nextSortId) => {
    setSortBy(nextSortId);
    setIsSortMenuOpen(false);
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto bg-[linear-gradient(180deg,#eef7f6_0%,#f4faf9_16%,#f8fafc_100%)] font-booking pb-10">
      <div className="sticky top-0 z-20 border-b border-[#0F766E]/10 bg-white/92 px-4 pb-4 pt-10 shadow-[0_6px_20px_rgba(15,23,42,0.05)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft size={18} className="text-slate-900" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-slate-900">
              {fromCity} <span className="text-slate-300">→</span> {toCity}
            </h1>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">{visibleBuses.length || 0} {visibleBuses.length === 1 ? 'bus' : 'buses'} found</p>
          </div>
          <div className="rounded-2xl border border-[var(--app-primary,#0F766E)]/20 bg-[var(--app-primary-soft,#E7F3F2)] px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-primary,#0F766E)]">{formatTravelDate(date)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-5">
        {loading ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-slate-500 shadow-sm">
            <Loader2 size={32} className="mx-auto animate-spin text-slate-400" />
            <p className="mt-4 text-center text-sm font-bold text-slate-400">Finding available buses...</p>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-600">
            {error}
          </div>
        ) : null}

        {!loading && !error && visibleBuses.length === 0 ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">No buses found</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {showDealsOnly || showHighlyRatedOnly || sortBy !== 'recommended' || selectedCompany !== 'all'
                ? 'Try changing your filters to see more buses.'
                : 'Try searching for a different date or route.'}
            </p>
          </div>
        ) : null}

        {!loading && !error && buses.length > 0 ? (
          <>
            <div ref={sortMenuRef} className="relative pb-1">
              <div className="flex gap-2 overflow-x-auto">
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSortMenuOpen((current) => !current)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold shadow-sm transition ${
                      isSortMenuOpen
                        ? 'border-slate-300 bg-slate-50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <SlidersHorizontal size={14} />
                    {sortOption.label}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDealsOnly((current) => !current)}
                  className={`inline-flex shrink-0 items-center rounded-xl border px-4 py-2 text-xs font-bold shadow-sm transition ${
                    showDealsOnly
                      ? 'border-[var(--app-primary,#0F766E)]/20 bg-[var(--app-primary-soft,#E7F3F2)] text-[var(--app-primary,#0F766E)]'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  Deals
                </button>
                <button
                  type="button"
                  onClick={() => setShowHighlyRatedOnly((current) => !current)}
                  className={`inline-flex shrink-0 items-center rounded-xl border px-4 py-2 text-xs font-bold shadow-sm transition ${
                    showHighlyRatedOnly
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  Highly Rated
                </button>
              </div>

              {isSortMenuOpen ? (
                <div
                  className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-[min(20rem,calc(100vw-2rem))] rounded-[20px] border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.14)]"
                >
                  <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sort buses by
                  </p>
                  <div className="space-y-1">
                    {SORT_OPTIONS.map((option) => {
                      const isActive = sortBy === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleSortSelect(option.id)}
                          className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-xs font-bold transition ${
                            isActive
                              ? 'bg-[var(--app-primary,#0F766E)] text-white'
                              : 'bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{option.label}</span>
                          {isActive ? <Check size={14} /> : null}
                        </button>
                      );
                    })}
                  </div>

                  {busCompanies.length > 0 ? (
                    <>
                      <div className="mx-1 my-2 h-px bg-slate-100" />
                      <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Bus company
                      </p>
                      <div className="max-h-56 space-y-1 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => setSelectedCompany('all')}
                          className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-xs font-bold transition ${
                            selectedCompany === 'all'
                              ? 'bg-[var(--app-primary,#0F766E)] text-white'
                              : 'bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>All companies</span>
                          {selectedCompany === 'all' ? <Check size={14} /> : null}
                        </button>
                        {busCompanies.map((company) => {
                          const isActive = selectedCompany === company;

                          return (
                            <button
                              key={company}
                              type="button"
                              onClick={() => setSelectedCompany(company)}
                              className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-xs font-bold transition ${
                                isActive
                                  ? 'bg-[var(--app-primary,#0F766E)] text-white'
                                  : 'bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="truncate pr-3">{company}</span>
                              {isActive ? <Check size={14} className="shrink-0" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {!loading && !error
          ? visibleBuses.map((bus, index) => {
              const rated = hasBusRating(bus);
              const topAmenities = Array.isArray(bus.amenities) ? bus.amenities.slice(0, 2) : [];

              return (
                <motion.button
                  key={bus.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSelect(bus)}
                  className="w-full rounded-[24px] border border-slate-200/80 bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-transform active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-slate-900">{getBusCompany(bus) || 'Bus Service'}</h3>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                        {bus.type}{bus.busName ? ` • ${bus.busName}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-bold leading-none text-slate-900">₹{Number(bus.price || 0).toLocaleString('en-IN')}</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">per seat</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-bold leading-none text-slate-900">{bus.departure}</p>
                      <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">{fromCity}</p>
                    </div>
                    <div className="flex flex-1 flex-col items-center">
                      <span className="text-[11px] font-bold text-slate-500">{formatDurationBrief(bus.duration)}</span>
                      <span className="mt-1 h-px w-full bg-slate-200" />
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="text-lg font-bold leading-none text-slate-900">{bus.arrival}</p>
                      <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">{toCity}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {Number(bus.availableSeats) > 0 ? (
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${Number(bus.availableSeats) <= 5 ? 'bg-rose-50 text-rose-600' : 'bg-[var(--app-primary-soft,#E7F3F2)] text-[var(--app-primary,#0F766E)]'}`}>
                        {Number(bus.availableSeats) <= 5 ? `Only ${bus.availableSeats} left` : `${bus.availableSeats} seats left`}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">Sold out</span>
                    )}
                    {(String(bus.cancellationPolicy || '').toLowerCase().includes('free') || (bus.cancellationRules || []).some((rule) => rule.refundType === 'percentage' && Number(rule.refundValue) >= 100)) ? (
                      <span className="rounded-full bg-[#EEFAB8] px-3 py-1 text-[10px] font-bold text-[#4D5F00]">Free cancellation</span>
                    ) : null}
                    {rated ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700">
                        <Star size={11} className="fill-current" /> {getBusRating(bus).toFixed(1)}
                      </span>
                    ) : null}
                    <span className={`ml-auto inline-flex items-center gap-1 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm ${Number(bus.availableSeats) > 0 ? 'bg-[var(--app-primary,#0F766E)] text-white shadow-[#0F766E]/25' : 'bg-slate-100 text-slate-400'}`}>
                      {Number(bus.availableSeats) > 0 ? 'Book' : 'Sold out'} {Number(bus.availableSeats) > 0 ? <ChevronRight size={16} /> : null}
                    </span>
                  </div>
                </motion.button>
              );
            })
          : null}
      </div>
    </div>
  );
};

export default BusList;
