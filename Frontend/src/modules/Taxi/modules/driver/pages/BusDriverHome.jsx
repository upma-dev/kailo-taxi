import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Award,
  Bus,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Globe,
  IndianRupee,
  Info,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  MessageSquare,
  Navigation,
  Pencil,
  Phone,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  TrendingUp,
  User,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { clearDriverAuthState, getCurrentDriver, createDriverSupportTicket, updateDriverProfile } from '../services/registrationService';
import BusDriverBottomNav from '../components/BusDriverBottomNav';
import { useImageUpload } from '../../../shared/hooks/useImageUpload';
import brandLogo from '@/assets/brand/logo.png';
import {
  createBusDriverReservation,
  getBusDriverBookings,
  getBusDriverSeatLayout,
} from '../services/busDriverService';

// Format Helpers
const unwrap = (response) => response?.data?.data || response?.data || response;
const unwrapResults = (response) => response?.data?.results || response?.results || [];

const formatDateKey = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return '';
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, monthIndex, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== monthIndex ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
};

const createToday = () => formatDateKey(new Date());
const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const timeToMinutes = (value) => {
  const match = String(value || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = (match[3] || '').toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const tripDayWord = (dateKey) => {
  if (dateKey === createToday()) return 'Today';
  const next = new Date();
  next.setDate(next.getDate() + 1);
  if (dateKey === formatDateKey(next)) return 'Tomorrow';
  const parsed = parseDateKey(dateKey);
  return parsed ? parsed.toLocaleDateString('en-IN', { weekday: 'long' }) : dateKey;
};

const formatCurrency = (value, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDisplayDate = (value) => {
  if (!value) return 'No date selected';
  const date = parseDateKey(value) || new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getNextTravelDate = (schedule) => {
  const activeDays = Array.isArray(schedule?.activeDays) ? schedule.activeDays : [];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let index = 0; index < 14; index += 1) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + index);
    const label = dayLabels[nextDate.getDay()];
    if (activeDays.length === 0 || activeDays.includes(label)) {
      return formatDateKey(nextDate);
    }
  }
  return createToday();
};

const getGreetingByTimezone = () => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 22) return 'Good Evening';
  return 'Good Night';
};

const countBlueprintSeats = (blueprint = {}) =>
  ['lowerDeck', 'upperDeck']
    .flatMap((deckKey) => (Array.isArray(blueprint?.[deckKey]) ? blueprint[deckKey] : []))
    .flatMap((row) => (Array.isArray(row) ? row : []))
    .filter((cell) => cell?.kind === 'seat').length;

const EmptyCard = ({ icon: Icon, title, text, action }) => (
  <section className="flex flex-col items-center rounded-[28px] border border-slate-200/80 bg-white px-6 py-10 text-center shadow-sm">
    <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-100 text-slate-400">
      <Icon size={36} />
    </div>
    <h3 className="mt-5 text-xl font-black text-slate-900">{title}</h3>
    <p className="mt-2 max-w-xs text-sm font-medium leading-relaxed text-slate-500">{text}</p>
    {action}
  </section>
);

// Interactive Seat Deck Layout Component
const SeatDeck = ({ title, rows, selectedSeatIds, onToggle }) => {
  if (!rows?.length) return null;

  return (
    <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-[#0F172A] text-[color:var(--app-primary,#FF6B00)]">
            <Bus size={16} />
          </div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">{title}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-700 border border-slate-200">
          Coach Deck
        </span>
      </div>

      <div className="space-y-3">
        {rows.map((row, rowIndex) => (
          <div key={`${title}-${rowIndex}`} className="grid grid-cols-5 gap-2.5">
            {row.map((seat, cellIndex) => {
              if (!seat || seat.kind !== 'seat') {
                return <div key={`${title}-${rowIndex}-${cellIndex}`} className="h-11 rounded-2xl bg-slate-100/50 border border-dashed border-slate-200/60" />;
              }

              const isBooked = seat.status === 'booked';
              const isSelected = selectedSeatIds.some((item) => item.id === seat.id);

              return (
                <button
                  key={`${title}-${seat.id}`}
                  type="button"
                  disabled={isBooked}
                  onClick={() => onToggle(seat)}
                  className={`relative flex h-14 flex-col items-center justify-center rounded-2xl border text-xs font-black leading-tight transition-all ${
                    isBooked
                      ? 'cursor-not-allowed border-rose-200 bg-rose-50 text-rose-400'
                      : isSelected
                        ? 'border-[color:var(--app-primary,#FF6B00)] bg-[color:var(--app-primary,#FF6B00)] text-white shadow-md shadow-[color:var(--app-primary,#FF6B00)]/30'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-[color:var(--app-primary,#FF6B00)] hover:bg-orange-50/50'
                  }`}
                >
                  <span className="absolute inset-x-2 top-1 h-0.5 rounded-full bg-slate-300/60" />
                  <span>{seat.label || seat.id}</span>
                  {!isBooked && Number(seat.price) > 0 ? (
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-white/85' : 'text-slate-400'}`}>
                      ₹{Number(seat.price).toLocaleString('en-IN')}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
};

const BusDriverHome = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [layout, setLayout] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [travelDate, setTravelDate] = useState(createToday());
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingDesk, setLoadingDesk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deskError, setDeskError] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingFilter, setBookingFilter] = useState('all');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [supportNote, setSupportNote] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [isBookingSheetOpen, setIsBookingSheetOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [openScheduleId, setOpenScheduleId] = useState(null);
  const [nowTick, setNowTick] = useState(0);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', profileImage: '' });
  const { uploading: photoUploading, handleFileChange: onPhotoPicked } = useImageUpload({
    folder: 'bus-driver-profiles',
    onSuccess: (url) => setProfileForm((form) => ({ ...form, profileImage: url })),
  });
  const sheetDrag = useDragControls();
  const [passengerForm, setPassengerForm] = useState({ name: '', phone: '', age: '', gender: 'male', notes: '' });

  useEffect(() => {
    const timer = setInterval(() => setNowTick((n) => n + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const confirmLogout = useCallback(() => {
    setIsLogoutConfirmOpen(true);
  }, []);

  const doLogout = useCallback(() => {
    setIsLogoutConfirmOpen(false);
    clearDriverAuthState();
    navigate('/taxi/driver/login', { replace: true });
  }, [navigate]);

  const busService = profile?.busService || null;
  // Admin has not approved the bus yet: the captain can log in but cannot run the desk.
  const isAwaitingApproval =
    Boolean(profile) &&
    (String(profile.status || '').toLowerCase() === 'pending' ||
      profile.approve === false ||
      (busService && String(busService.status || '') !== 'active'));
  const schedules = Array.isArray(busService?.schedules) ? busService.schedules : [];
  const openSchedule = schedules.find((item) => item.id === openScheduleId) || null;
  const routeStops = Array.isArray(busService?.route?.stops) ? busService.route.stops : [];
  const selectedSchedule =
    schedules.find((item) => item.id === selectedScheduleId) || schedules[0] || null;

  const currentGreeting = useMemo(() => getGreetingByTimezone(), []);

  // Driver Display Name (cleaned of inline parenthetical route names)
  const driverDisplayName = useMemo(() => {
    const raw = busService?.driverName || profile?.name || 'Captain';
    const cleanName = raw.replace(/\s*\([^)]*\)/g, '').trim();
    return cleanName
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }, [busService, profile]);

  // Clean Route Text
  const driverRouteText = useMemo(() => {
    const rawName = busService?.driverName || profile?.name || '';
    const match = rawName.match(/\(([^)]+)\)/);
    const inNameRoute = match ? match[1] : '';
    const mainRoute = busService?.routeLabel || busService?.route?.routeName || profile?.assignedRoute || profile?.routeName || 'Route not assigned';
    const combined = inNameRoute ? `${mainRoute} (${inNameRoute})` : mainRoute;
    return combined
      .split(' ')
      .map((w) => {
        if (w.startsWith('(')) {
          return '(' + w.slice(1, 2).toUpperCase() + w.slice(2).toLowerCase();
        }
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(' ');
  }, [busService, profile]);

  const driverIdCode = useMemo(
    () => profile?.driverCode || (profile?.id ? `BD-${String(profile.id).slice(-4).toUpperCase()}` : '--'),
    [profile],
  );

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoadingProfile(true);
      setProfileError('');
      try {
        const response = await getCurrentDriver();
        const data = unwrap(response);
        if (!active) return;
        setProfile(data);

        const firstSchedule = Array.isArray(data?.busService?.schedules) ? data.busService.schedules[0] : null;
        if (firstSchedule?.id) {
          setSelectedScheduleId(firstSchedule.id);
          const nextDate = getNextTravelDate(firstSchedule);
          setTravelDate(nextDate);
        }
      } catch (error) {
        if (!active) return;
        setProfile(null);
        setProfileError(
          String(error?.response?.data?.message || error?.message || 'Unable to load your account').slice(0, 140),
        );
      } finally {
        if (active) setLoadingProfile(false);
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [reloadKey]);


  useEffect(() => {
    if (!selectedScheduleId || !travelDate || isAwaitingApproval) return;
    let active = true;

    const loadDesk = async () => {
      setLoadingDesk(true);
      setDeskError('');
      try {
        const [layoutResponse, bookingsResponse] = await Promise.all([
          getBusDriverSeatLayout({ scheduleId: selectedScheduleId, date: travelDate }),
          getBusDriverBookings({ scheduleId: selectedScheduleId, date: travelDate }),
        ]);

        if (!active) return;
        setLayout(unwrap(layoutResponse));
        setBookings(unwrapResults(bookingsResponse));
      } catch (error) {
        if (!active) return;
        setDeskError(error?.message || 'Unable to load seat desk');
        setLayout(null);
        setBookings([]);
      } finally {
        if (active) setLoadingDesk(false);
      }
    };

    loadDesk();
    return () => {
      active = false;
    };
  }, [selectedScheduleId, travelDate, isAwaitingApproval]);

  const totalSeatCount = useMemo(() => countBlueprintSeats(layout?.blueprint), [layout?.blueprint]);
  const availableSeatsCount = useMemo(() => Number(layout?.availableSeats ?? (totalSeatCount || 0)), [layout?.availableSeats, totalSeatCount]);
  const todaysManualReservations = useMemo(
    () => bookings.filter((item) => item.bookingSource === 'bus_driver').length,
    [bookings],
  );

  // Every trip the captain has to drive in the next 7 days (from the owner's timings), earliest first.
  const upcomingTrips = useMemo(() => {
    if (!busService || isAwaitingApproval) return [];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const summary = Array.isArray(profile?.tripSummary) ? profile.tripSummary : [];
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const trips = [];

    for (let i = 0; i < 7; i += 1) {
      const day = new Date();
      day.setDate(day.getDate() + i);
      const dateKey = formatDateKey(day);
      const dayLabel = dayLabels[day.getDay()];

      schedules.forEach((item) => {
        if ((item.status || 'active') !== 'active') return;
        if (Array.isArray(item.activeDays) && item.activeDays.length && !item.activeDays.includes(dayLabel)) return;
        const departure = timeToMinutes(item.departureTime);
        if (i === 0 && departure !== null && departure < nowMinutes) return;
        const counts = summary.find((row) => row.travelDate === dateKey && row.scheduleId === item.id);
        trips.push({
          key: `${dateKey}-${item.id}`,
          date: dateKey,
          schedule: item,
          sortMinutes: departure ?? 0,
          seats: Number(counts?.seats || 0),
          bookings: Number(counts?.bookings || 0),
        });
      });
    }

    return trips.sort((a, b) => (a.date === b.date ? a.sortMinutes - b.sortMinutes : a.date < b.date ? -1 : 1));
  }, [busService, isAwaitingApproval, schedules, profile?.tripSummary, nowTick]);

  useEffect(() => {
    if (!upcomingTrips.length) return;
    const stillValid = upcomingTrips.some((trip) => trip.date === travelDate && trip.schedule.id === selectedScheduleId);
    if (!stillValid) {
      setSelectedScheduleId(upcomingTrips[0].schedule.id);
      setTravelDate(upcomingTrips[0].date);
      setSelectedSeats([]);
      setTripOpen(false);
    }
  }, [upcomingTrips, travelDate, selectedScheduleId]);

  // One dropdown with only the trips that are still to come (used by Seat Desk and Bookings).
  const tripSelectEl = (
    <label className="block">
      <span className="text-[10px] font-black uppercase text-slate-400">Trip</span>
      <select
        value={`${travelDate}|${selectedScheduleId}`}
        onChange={(e) => {
          const [dateKey, scheduleKey] = e.target.value.split('|');
          setTravelDate(dateKey);
          setSelectedScheduleId(scheduleKey);
          setSelectedSeats([]);
        }}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 outline-none focus:border-[color:var(--app-primary,#FF6B00)]"
      >
        {upcomingTrips.map((trip) => (
          <option key={trip.key} value={`${trip.date}|${trip.schedule.id}`}>
            {tripDayWord(trip.date)}, {formatDisplayDate(trip.date)} · {trip.schedule.departureTime}
          </option>
        ))}
      </select>
    </label>
  );

  const openTrip = (trip) => {
    setSelectedScheduleId(trip.schedule.id);
    setTravelDate(trip.date);
    setSelectedSeats([]);
    setTripOpen(true);
  };

  // What the passenger must pay now: the sum of the owner's price for each chosen seat.
  const selectedTotal = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + Number(seat.price || 0), 0),
    [selectedSeats],
  );

  // Price list shown above the seat map ("Window seat ₹500 · Aisle seat ₹450").
  const seatPriceList = useMemo(() => {
    const names = { seat: 'Seat', window: 'Window seat', aisle: 'Aisle seat', sleeper: 'Sleeper' };
    const found = new Map();
    ['lowerDeck', 'upperDeck'].forEach((deck) => {
      (layout?.blueprint?.[deck] || []).flat().forEach((cell) => {
        if (cell?.kind !== 'seat' || !(Number(cell.price) > 0)) return;
        const key = `${cell.variant || 'seat'}:${cell.price}`;
        if (!found.has(key)) found.set(key, { label: names[cell.variant] || 'Seat', price: Number(cell.price) });
      });
    });
    return [...found.values()];
  }, [layout?.blueprint]);

  const activeBookings = useMemo(
    () => bookings.filter((item) => !['cancelled', 'rejected', 'expired'].includes(String(item.status || '').toLowerCase())),
    [bookings],
  );
  const bookedSeatCount = useMemo(
    () => activeBookings.reduce((sum, item) => sum + (Array.isArray(item.seatLabels) ? item.seatLabels.length : 0), 0),
    [activeBookings],
  );

  const filteredBookings = useMemo(() => {
    const query = bookingSearch.trim().toLowerCase();
    return bookings.filter((booking) => {
      const sourceLabel = booking.bookingSource === 'bus_driver' ? 'manual' : 'user';
      const matchesFilter =
        bookingFilter === 'all'
          ? true
          : bookingFilter === 'manual'
            ? booking.bookingSource === 'bus_driver'
            : booking.status === bookingFilter || sourceLabel === bookingFilter;

      if (!matchesFilter) return false;
      if (!query) return true;

      const searchableValues = [
        booking.bookingCode,
        booking.passenger?.name,
        booking.passenger?.phone,
        booking.passenger?.email,
        booking.seatLabels?.join(' '),
        booking.notes,
      ];

      return searchableValues.some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [bookingFilter, bookingSearch, bookings]);

  const handleToggleSeat = (seat) => {
    setSelectedSeats((current) =>
      current.some((item) => item.id === seat.id)
        ? current.filter((item) => item.id !== seat.id)
        : [...current, { id: seat.id, label: seat.label || seat.id, price: Number(seat.price || 0) }],
    );
  };

  const openEditProfile = () => {
    setProfileForm({ name: profile?.name || '', email: profile?.email || '', profileImage: profile?.profileImage || '' });
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    const name = profileForm.name.trim();
    const email = profileForm.email.trim();
    if (photoUploading) return toast.error('Wait for the photo to finish uploading');
    if (!/^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/.test(name)) return toast.error('Name can have letters only');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Enter a valid email like name@gmail.com');

    setSavingProfile(true);
    try {
      await updateDriverProfile({ name, email, profileImage: profileForm.profileImage });
      const fresh = await getCurrentDriver();
      setProfile(unwrap(fresh));
      toast.success('Profile updated');
      setIsEditProfileOpen(false);
    } catch (error) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Could not save profile').slice(0, 120));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleReserveSeats = async () => {
    const name = passengerForm.name.trim();
    const phone = passengerForm.phone.replace(/\D/g, '').slice(-10);
    const age = Number(passengerForm.age);

    if (!selectedSeats.length) return toast.error('Select at least one seat');
    if (name.length < 2) return toast.error('Enter passenger name');
    if (phone.length !== 10) return toast.error('Enter a valid 10-digit mobile number');
    if (!Number.isFinite(age) || age < 1 || age > 120) return toast.error('Enter a valid age');

    setSubmitting(true);
    try {
      await createBusDriverReservation({
        scheduleId: selectedScheduleId,
        travelDate,
        seatIds: selectedSeats.map((seat) => seat.id),
        passenger: { name, phone, age, gender: passengerForm.gender },
        notes: passengerForm.notes.trim(),
      });
      toast.success(`Booked for ${name}. Amount: ${formatCurrency(selectedTotal, layout?.currency)}`);
      setSelectedSeats([]);
      setPassengerForm({ name: '', phone: '', age: '', gender: 'male', notes: '' });
      setIsBookingSheetOpen(false);

      const [layoutResponse, bookingsResponse] = await Promise.all([
        getBusDriverSeatLayout({ scheduleId: selectedScheduleId, date: travelDate }),
        getBusDriverBookings({ scheduleId: selectedScheduleId, date: travelDate }),
      ]);
      setLayout(unwrap(layoutResponse));
      setBookings(unwrapResults(bookingsResponse));
      getCurrentDriver().then((res) => setProfile(unwrap(res))).catch(() => {});
    } catch (error) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Unable to book seats').slice(0, 120));
    } finally {
      setSubmitting(false);
    }
  };

  const refreshDesk = async () => {
    setLoadingDesk(true);
    try {
      const profileResponse = await getCurrentDriver();
      const freshProfile = unwrap(profileResponse);
      setProfile(freshProfile);

      const activeSchedules = Array.isArray(freshProfile?.busService?.schedules)
        ? freshProfile.busService.schedules
        : [];
      const activeScheduleId = selectedScheduleId || activeSchedules[0]?.id || '';

      const stillPending =
        String(freshProfile?.status || '').toLowerCase() === 'pending' ||
        freshProfile?.approve === false ||
        (freshProfile?.busService && String(freshProfile.busService.status || '') !== 'active');

      if (activeScheduleId && travelDate && !stillPending) {
        if (!selectedScheduleId && activeScheduleId) {
          setSelectedScheduleId(activeScheduleId);
        }
        const [layoutResponse, bookingsResponse] = await Promise.all([
          getBusDriverSeatLayout({ scheduleId: activeScheduleId, date: travelDate }),
          getBusDriverBookings({ scheduleId: activeScheduleId, date: travelDate }),
        ]);
        setLayout(unwrap(layoutResponse));
        setBookings(unwrapResults(bookingsResponse));
      }
      setDeskError('');
      toast.success('Live dashboard data refreshed!');
    } catch (error) {
      setDeskError(error?.message || 'Unable to refresh dashboard');
    } finally {
      setLoadingDesk(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0F172A] text-[color:var(--app-primary,#FF6B00)] shadow-xl">
            <Loader2 size={24} className="animate-spin" />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Initializing Driver Cockpit...
          </p>
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6">
        <div className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500">
            <XCircle size={26} />
          </div>
          <h2 className="mt-4 text-lg font-black text-slate-900">Could not load your account</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">{profileError || 'Please try again.'}</p>
          <button
            type="button"
            onClick={() => setReloadKey((n) => n + 1)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] py-3 text-sm font-black text-white cursor-pointer"
          >
            <RefreshCw size={16} /> Try again
          </button>
          <button
            type="button"
            onClick={doLogout}
            className="mt-2 w-full rounded-2xl border border-slate-200 py-3 text-sm font-black text-slate-600 cursor-pointer"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen bg-[#F8FAFC] text-slate-900 pb-28 w-full overflow-x-hidden"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* Background Decorative Gradient Blobs (5% Opacity) */}
      <div className="pointer-events-none fixed -top-24 -right-24 h-96 w-96 rounded-full bg-[color:var(--app-primary,#FF6B00)]/5 blur-3xl" />
      <div className="pointer-events-none fixed top-1/3 -left-24 h-96 w-96 rounded-full bg-[#0F172A]/5 blur-3xl" />
      <div className="pointer-events-none fixed bottom-20 right-10 h-80 w-80 rounded-full bg-blue-600/5 blur-3xl" />

      {/* APP BAR */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white p-0.5">
              <img src={brandLogo} alt="Kailo Taxi" className="h-full w-full rounded-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--app-primary,#FF6B00)]">Bus Captain</p>
              <p className="truncate text-sm font-black text-slate-900">
                {busService?.operatorName || profile?.operatorName || 'Kailo Taxi Bus'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshDesk}
              disabled={loadingDesk}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:text-[color:var(--app-primary,#FF6B00)] disabled:opacity-50 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={16} className={loadingDesk ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F172A] text-white cursor-pointer"
              title="Profile"
            >
              {profile?.profileImage ? (
                <img src={profile.profileImage} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <User size={16} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER BASED ON ACTIVE TAB */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">

        {/* TAB 1: OVERVIEW / HOME */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <p className="px-1 text-sm font-bold text-slate-500">
              {currentGreeting}, <span className="font-black text-slate-900">{driverDisplayName.split(' ')[0]}</span>
            </p>

            {isAwaitingApproval && busService && (
              <div className="flex items-start gap-3 rounded-[22px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-600">
                  <Clock size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-amber-900">Waiting for admin approval</p>
                  <p className="mt-0.5 text-xs font-medium text-amber-800/80">
                    {busService.busName || 'Your bus'} is under review. Seat desk, bookings and schedules unlock as soon as admin approves it.
                  </p>
                </div>
              </div>
            )}

            {!busService && (
              <section className="flex flex-col items-center rounded-[28px] border border-slate-200/80 bg-white px-6 py-10 text-center shadow-sm">
                <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <Bus size={36} />
                </div>
                <h3 className="mt-5 text-xl font-black text-slate-900">No bus assigned yet</h3>
                <p className="mt-2 max-w-xs text-sm font-medium leading-relaxed text-slate-500">
                  Your bus owner needs to add you as the driver of a bus. Once they do, your trips and passengers will show up here.
                </p>
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(true)}
                  className="mt-6 flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-[#0F172A] py-3.5 text-sm font-black text-white cursor-pointer"
                >
                  <MessageSquare size={16} /> Message support
                </button>
              </section>
            )}

            {/* ───────── HOME = "when do I drive?" ───────── */}
            {busService && !isAwaitingApproval && upcomingTrips.length === 0 && (
              <EmptyCard
                icon={Clock}
                title="No trips coming up"
                text="Your bus owner has not set any trip timing yet, or all timings are paused. Trips will show here once they are set."
              />
            )}

            {/* LIST OF TRIPS */}
            {busService && !isAwaitingApproval && upcomingTrips.length > 0 && !tripOpen && (
              <>
                {/* next trip, big and simple */}
                <section className="overflow-hidden rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Your next trip</p>
                  <p className="mt-1.5 text-2xl font-black leading-none text-slate-900">{tripDayWord(upcomingTrips[0].date)}</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{formatDisplayDate(upcomingTrips[0].date)}</p>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Leave at</p>
                      <p className="text-3xl font-black leading-none text-slate-900">{upcomingTrips[0].schedule.departureTime || '--'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Reach by</p>
                      <p className="text-lg font-black text-slate-700">{upcomingTrips[0].schedule.arrivalTime || '--'}</p>
                    </div>
                  </div>

                  <p className="mt-3 flex items-center gap-2 text-sm font-black text-slate-900">
                    <MapPin size={18} className="shrink-0 text-emerald-600" />
                    <span className="truncate">{busService.route?.originCity || 'Start'}</span>
                    <ArrowRight size={16} className="shrink-0 text-slate-400" />
                    <span className="truncate">{busService.route?.destinationCity || 'End'}</span>
                  </p>

                  <p className="mt-3 rounded-xl bg-white px-3 py-2.5 text-xs font-semibold leading-snug text-slate-600">
                    Be at the bus 30 minutes before time.{' '}
                    {upcomingTrips[0].seats > 0
                      ? `${upcomingTrips[0].seats} seat${upcomingTrips[0].seats === 1 ? '' : 's'} booked so far.`
                      : 'No seat booked yet.'}
                  </p>

                  <button
                    type="button"
                    onClick={() => openTrip(upcomingTrips[0])}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--app-primary,#FF6B00)] py-3 text-sm font-black text-white shadow-sm active:scale-[0.99] cursor-pointer"
                  >
                    <Users size={18} /> See passengers
                  </button>
                </section>

                {/* other trips */}
                {upcomingTrips.length > 1 && (
                  <section className="space-y-3">
                    <div className="px-1">
                      <h3 className="text-base font-black text-slate-900">Coming trips</h3>
                      <p className="text-xs font-medium text-slate-500">Tap a trip to see who has booked.</p>
                    </div>
                    {upcomingTrips.slice(1).map((trip) => (
                      <button
                        key={trip.key}
                        type="button"
                        onClick={() => openTrip(trip)}
                        className="flex w-full items-center gap-3 rounded-[20px] border border-slate-200/80 bg-white p-3 text-left shadow-sm active:scale-[0.99] cursor-pointer"
                      >
                        <div className="w-24 shrink-0">
                          <p className="text-sm font-black text-slate-900">{tripDayWord(trip.date)}</p>
                          <p className="text-xs font-bold text-slate-500">{formatDisplayDate(trip.date)}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-black leading-tight text-slate-900">{trip.schedule.departureTime || '--'}</p>
                          <p className="truncate text-xs font-bold text-slate-500">
                            {busService.route?.originCity} → {busService.route?.destinationCity}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-black text-slate-900">{trip.seats}</p>
                          <p className="text-[10px] font-black uppercase text-slate-400">seats</p>
                        </div>
                        <ChevronRight size={18} className="shrink-0 text-slate-300" />
                      </button>
                    ))}
                  </section>
                )}

                {/* how it works, in plain words */}
                <section className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-black text-slate-900">How to use this app</h3>
                  <ol className="mt-2.5 space-y-2 text-xs font-medium text-slate-600">
                    <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-black text-white">1</span>Look at your trip day and time above.</li>
                    <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-black text-white">2</span>Tap the trip to see the passengers. You can call them.</li>
                    <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-black text-white">3</span>If someone pays you cash at the bus, use Seat Desk to give them a seat.</li>
                  </ol>
                </section>
              </>
            )}

            {/* ONE TRIP IN DETAIL */}
            {busService && !isAwaitingApproval && tripOpen && selectedSchedule && (
              <>
                <button
                  type="button"
                  onClick={() => setTripOpen(false)}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm cursor-pointer"
                >
                  <ArrowLeft size={16} /> All trips
                </button>

                <section className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm">
                  <p className="text-xl font-black text-slate-900">{tripDayWord(travelDate)}</p>
                  <p className="text-sm font-bold text-slate-500">{formatDisplayDate(travelDate)}</p>

                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">{busService.route?.originCity || 'Start'}</p>
                      <p className="text-lg font-black text-emerald-700">{selectedSchedule.departureTime || '--'}</p>
                    </div>
                    <ArrowRight size={20} className="shrink-0 text-slate-400" />
                    <div className="min-w-0 text-right">
                      <p className="truncate text-base font-black text-slate-900">{busService.route?.destinationCity || 'End'}</p>
                      <p className="text-lg font-black text-slate-700">{selectedSchedule.arrivalTime || '--'}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span className="text-slate-800">{bookedSeatCount} seats booked</span>
                      <span className="text-slate-500">{availableSeatsCount} empty</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${totalSeatCount ? Math.min(100, (bookedSeatCount / totalSeatCount) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="px-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-black text-slate-900">Passengers on this trip</h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-600">{activeBookings.length}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-500">These people have booked a seat. Tap the green phone to call.</p>
                  </div>

                  {loadingDesk ? (
                    <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-slate-400" /></div>
                  ) : activeBookings.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-6 text-center">
                      <Users size={22} className="mx-auto text-slate-300" />
                      <p className="mt-2 text-sm font-black text-slate-700">Nobody has booked yet</p>
                      <p className="text-xs font-medium text-slate-400">New bookings will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeBookings.map((b) => (
                        <div key={b._id || b.id} className="flex items-center gap-3 rounded-[22px] border border-slate-200/80 bg-white p-3.5 shadow-sm">
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-base font-black text-slate-700">
                            {(b.passenger?.name || 'P').trim().charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-black text-slate-900">{b.passenger?.name || 'Passenger'}</p>
                            <p className="truncate text-xs font-bold text-slate-500">
                              Seat {b.seatLabels?.join(', ') || '-'}
                            </p>
                          </div>
                          {b.passenger?.phone ? (
                            <a
                              href={`tel:${b.passenger.phone}`}
                              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-sm"
                              aria-label="Call passenger"
                            >
                              <Phone size={18} />
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold leading-snug text-slate-600">
                    Someone paying you cash at the bus? Give them a seat from here.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('desk')}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-sm font-black text-white active:scale-[0.99] cursor-pointer"
                  >
                    <Ticket size={16} /> Give a seat to a passenger
                  </button>
                </section>
              </>
            )}

          </div>
        )}

        {/* TAB 2: SCHEDULE (set by the bus owner, read-only for the captain) */}
        {activeTab === 'schedule' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="px-1">
              <h3 className="text-lg font-black text-slate-900">Bus timings</h3>
              <p className="text-xs font-medium text-slate-500">Set by your bus owner. Tap a timing to see the days and stops.</p>
            </div>

            {!busService ? (
              <EmptyCard icon={Bus} title="No bus assigned yet" text="Your bus owner needs to add you as the driver of a bus." />
            ) : schedules.length === 0 ? (
              <EmptyCard icon={Clock} title="Timings not added yet" text="Your bus owner sets the trip timings. They will appear here once added." />
            ) : (
              schedules.map((item) => {
                const days = Array.isArray(item.activeDays) ? item.activeDays : [];
                const daysText = !days.length || days.length === 7 ? 'Every day' : days.join(', ');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOpenScheduleId(item.id)}
                    className="flex w-full items-center gap-3 rounded-[22px] border border-slate-200/80 bg-white p-4 text-left shadow-sm active:scale-[0.99] cursor-pointer"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <Clock size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-black text-slate-900">{item.label || 'Trip'}</p>
                        {(item.status || 'active') !== 'active' ? (
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-500">{item.status}</span>
                        ) : null}
                      </div>
                      <p className="text-base font-black text-slate-900">
                        {item.departureTime || '--'} <span className="text-slate-300">→</span> {item.arrivalTime || '--'}
                      </p>
                      <p className="truncate text-xs font-bold text-slate-500">{daysText}</p>
                    </div>
                    <ChevronRight size={18} className="shrink-0 text-slate-300" />
                  </button>
                );
              })
            )}
          </motion.div>
        )}

        {/* TAB 3: SEAT DESK */}
        {activeTab === 'desk' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {!busService || isAwaitingApproval || upcomingTrips.length === 0 ? (
              <EmptyCard
                icon={!busService ? Bus : isAwaitingApproval ? ShieldCheck : Clock}
                title={!busService ? 'No bus assigned yet' : isAwaitingApproval ? 'Waiting for approval' : 'No trips coming up'}
                text={
                  !busService
                    ? 'Your bus owner needs to add you as the driver of a bus.'
                    : isAwaitingApproval
                      ? 'The seat desk opens once admin approves your bus.'
                      : 'There is no trip left to book. New trips will show here once your bus owner sets timings.'
                }
              />
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  {tripSelectEl}
                </div>

                {selectedSeats.length > 0 ? (
                  <div className="sticky top-[72px] z-30 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
                    <div className="min-w-0 pl-1">
                      <p className="text-xs font-black text-slate-900">{selectedSeats.length} seat(s) selected</p>
                      <p className="truncate text-[11px] font-semibold text-slate-500">
                        Seat {selectedSeats.map((seat) => seat.label).join(', ')} • Collect{' '}
                        <span className="font-black text-slate-900">{formatCurrency(selectedTotal, layout?.currency || busService?.fareCurrency)}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBookingSheetOpen(true)}
                      className="shrink-0 rounded-xl bg-[color:var(--app-primary,#FF6B00)] px-4 py-2.5 text-xs font-black text-white shadow-md cursor-pointer"
                    >
                      Book seats
                    </button>
                  </div>
                ) : null}

                {layout?.blueprint && seatPriceList.length > 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <p className="text-xs font-bold text-slate-500">Seat prices set by the bus owner</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {seatPriceList.map((item) => (
                        <span key={`${item.label}-${item.price}`} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                          {item.label} <span className="font-black text-slate-900">{formatCurrency(item.price, layout?.currency)}</span>
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] font-medium text-slate-400">Red seat = already booked. Tap a free seat to select it.</p>
                  </div>
                ) : null}

                {layout?.blueprint ? (
                  <div className="space-y-4">
                    <SeatDeck
                      title="Lower Deck Layout"
                      rows={layout.blueprint.lowerDeck}
                      selectedSeatIds={selectedSeats}
                      onToggle={handleToggleSeat}
                    />
                    <SeatDeck
                      title="Upper Deck Layout"
                      rows={layout.blueprint.upperDeck}
                      selectedSeatIds={selectedSeats}
                      onToggle={handleToggleSeat}
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs font-bold text-slate-500">
                    {loadingDesk ? (
                      <Loader2 size={20} className="mx-auto animate-spin text-slate-400" />
                    ) : (
                      <>
                        <p>{deskError || 'Seat layout is not available for this bus.'}</p>
                        <button
                          type="button"
                          onClick={refreshDesk}
                          className="mt-3 rounded-xl bg-[#0F172A] px-4 py-2 text-xs font-black text-white cursor-pointer"
                        >
                          Try again
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* TAB 4: BOOKINGS */}
        {activeTab === 'bookings' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--app-primary,#FF6B00)]">Passenger Manifest</p>
                <h3 className="text-base font-black text-slate-900">Booked tickets ({filteredBookings.length})</h3>
              </div>
            </div>

            {upcomingTrips.length > 0 ? (
              tripSelectEl
            ) : (
              <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
                No trips coming up, so there are no passengers to show.
              </div>
            )}

            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by passenger name, phone, seat number..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-[color:var(--app-primary,#FF6B00)]"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                ['all', 'All'],
                ['manual', 'Desk'],
                ['user', 'App'],
                ['confirmed', 'Confirmed'],
                ['cancelled', 'Cancelled'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setBookingFilter(id)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-black cursor-pointer ${
                    bookingFilter === id
                      ? 'border-[#0F172A] bg-[#0F172A] text-white'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              {filteredBookings.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-xs font-bold text-slate-400 border border-slate-200">
                  No matching seat bookings found for selected date.
                </div>
              ) : (
                filteredBookings.map((b) => (
                  <div key={b._id || b.id} className="flex items-center justify-between rounded-2xl bg-slate-50/70 p-3.5 border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F172A] text-[color:var(--app-primary,#FF6B00)]">
                        <Ticket size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">{b.passenger?.name || 'Passenger'}</p>
                        <p className="text-[11px] font-medium text-slate-500">{b.passenger?.phone || '-'} • Seats: {b.seatLabels?.join(', ') || 'Seats'}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[9px] font-black uppercase text-emerald-800 border border-emerald-200">
                        {b.bookingSource === 'bus_driver' ? 'Manual Desk' : b.status || 'Confirmed'}
                      </span>
                      <p className="text-xs font-black text-slate-900 mt-1">{formatCurrency(b.amount, b.currency)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 5: PROFILE (same look as the owner's Account page) */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="-mx-4 -mt-6 min-h-[75vh] bg-white pb-6 sm:mx-0 sm:mt-0 sm:rounded-[24px]"
          >
            {/* name + avatar */}
            <div className="border-b border-slate-100 px-5 pb-5 pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <h2 className="truncate text-[22px] font-bold leading-tight text-slate-900">{driverDisplayName}</h2>
                  <p className="text-[13px] font-semibold text-slate-500">Bus Captain • {driverIdCode}</p>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      isAwaitingApproval ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {isAwaitingApproval ? 'Waiting for approval' : 'Approved'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={openEditProfile}
                  aria-label="Edit profile"
                  className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-500 active:scale-95 transition-transform cursor-pointer"
                >
                  {profile?.profileImage ? (
                    <img src={profile.profileImage} alt={driverDisplayName} className="h-full w-full rounded-2xl object-cover" />
                  ) : (
                    <User size={30} strokeWidth={1.8} />
                  )}
                  <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-slate-900 text-white">
                    <Pencil size={11} />
                  </span>
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                {[
                  ['Phone', profile?.phone],
                  ['Email', profile?.email],
                  ['Operator', busService?.operatorName || profile?.operatorName],
                  ['Bus', busService?.busName],
                  ['Registration No.', busService?.registrationNumber],
                  ['Coach type', busService?.coachType],
                  ['Route', busService?.routeLabel || busService?.route?.routeName],
                  ['Seats / fare', busService ? `${totalSeatCount || busService.capacity || 0} seats · ${formatCurrency(busService.seatPrice, busService.fareCurrency)}` : ''],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <p className="text-[10px] font-medium text-slate-400">{label}</p>
                    <p className="break-words text-[12px] font-bold text-slate-900">{value || '-'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* summary */}
            <div className="mx-5 mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Trip Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Upcoming bookings', Number(profile?.metrics?.upcomingBookings ?? 0)],
                  ['Completed', Number(profile?.metrics?.completedBookings ?? 0)],
                  ['Trip timings', schedules.length],
                  ['Trips this week', upcomingTrips.length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1 text-[18px] font-black text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* menu */}
            {[
              {
                title: 'Your Work',
                items: [
                  { id: 'editProfile', label: 'Edit Profile', sub: 'Change your name or email', icon: Pencil, onClick: openEditProfile },
                  { id: 'timings', label: 'Bus Timings', sub: `${schedules.length} trip timing${schedules.length === 1 ? '' : 's'} set by owner`, icon: CalendarDays, onClick: () => setActiveTab('schedule') },
                  { id: 'bookings', label: 'Bookings', sub: 'Passengers who booked a seat', icon: ClipboardList, onClick: () => setActiveTab('bookings') },
                  { id: 'desk', label: 'Seat Desk', sub: 'Give a seat to a walk-in passenger', icon: Bus, onClick: () => setActiveTab('desk') },
                ],
              },
              {
                title: 'Help',
                items: [
                  { id: 'support', label: 'Contact Support', sub: 'Send a message to the admin', icon: MessageSquare, onClick: () => setIsContactModalOpen(true) },
                ],
              },
              {
                title: 'Preferences',
                items: [
                  { id: 'language', label: 'App Language', icon: Globe, onClick: () => window.dispatchEvent(new Event('kailo:open-language')) },
                ],
              },
            ].map((section) => (
              <div key={section.title} className="pt-5">
                <h3 className="mb-1 px-6 text-[11px] font-semibold uppercase tracking-widest text-slate-400">{section.title}</h3>
                {section.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.onClick}
                      className="flex w-full items-center justify-between border-b border-slate-50 px-6 py-4 text-left active:bg-slate-50 cursor-pointer"
                    >
                      <span className="flex items-center gap-5">
                        <ItemIcon size={20} className="text-slate-400" />
                        <span>
                          <span className="block text-[15px] font-medium tracking-tight text-slate-800">{item.label}</span>
                          {item.sub ? <span className="block text-[11px] font-medium text-slate-400">{item.sub}</span> : null}
                        </span>
                      </span>
                      <ChevronRight size={16} className="text-slate-300" />
                    </button>
                  );
                })}
              </div>
            ))}

            <div className="px-6 pb-4 pt-8">
              <button
                type="button"
                onClick={confirmLogout}
                className="flex items-center gap-3 text-[13px] font-bold text-rose-500 active:translate-x-1 transition-transform cursor-pointer"
              >
                <LogOut size={16} strokeWidth={2.5} />
                Logout from Account
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* FLOATING BOTTOM NAVIGATION */}
      <BusDriverBottomNav activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* ── Timing details sheet: scrolls inside, closes with the X, a tap outside, or a swipe down ── */}
      <AnimatePresence>
        {openSchedule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px]"
            onClick={() => setOpenScheduleId(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              drag="y"
              dragControls={sheetDrag}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 500) setOpenScheduleId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-[28px] bg-white shadow-2xl"
            >
              {/* handle + title: drag this part down to close */}
              <div
                className="touch-none cursor-grab px-5 pb-3 pt-3"
                onPointerDown={(e) => sheetDrag.start(e)}
              >
                <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-200" />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-slate-900">{openSchedule.label || 'Trip'}</p>
                    <p className="text-xs font-bold text-slate-500">
                      {busService?.route?.originCity} → {busService?.route?.destinationCity}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenScheduleId(null)}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="Close"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 cursor-pointer"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-5 overflow-y-auto overscroll-contain px-5 pb-8">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Leave</p>
                    <p className="text-2xl font-black text-slate-900">{openSchedule.departureTime || '--'}</p>
                  </div>
                  <ArrowRight size={20} className="text-slate-300" />
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Reach</p>
                    <p className="text-2xl font-black text-slate-900">{openSchedule.arrivalTime || '--'}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Runs on</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DAY_OPTIONS.map((day) => {
                      const on = !openSchedule.activeDays?.length || openSchedule.activeDays.includes(day);
                      return (
                        <span
                          key={day}
                          className={`rounded-full px-3 py-1.5 text-xs font-black ${on ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {routeStops.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">Stops on the way</p>
                    <div className="relative space-y-5 pl-6 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-0.5 before:bg-slate-200">
                      {routeStops.map((stop, idx) => (
                        <div key={stop.id || idx} className="relative flex items-start justify-between gap-3">
                          <span className="absolute -left-6 top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-emerald-500 bg-white">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-slate-900">{stop.city || 'Stop'}</p>
                            <p className="truncate text-[11px] font-medium text-slate-500">{stop.pointName || ''}</p>
                          </div>
                          <p className="shrink-0 text-xs font-black text-slate-900">{stop.departureTime || stop.arrivalTime || ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Passenger details bottom sheet (manual desk booking) ── */}
      <AnimatePresence>
        {isBookingSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm"
            onClick={() => !submitting && setIsBookingSheetOpen(false)}
          >
            <motion.div
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-[28px] bg-white p-5 pb-8 shadow-2xl space-y-4"
            >
              <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-200" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--app-primary,#FF6B00)]">Manual desk booking</p>
                <h3 className="text-lg font-black text-slate-900">
                  Seats {selectedSeats.map((seat) => seat.label).join(', ')}
                </h3>
                <p className="text-xs font-semibold text-slate-500">{formatDisplayDate(travelDate)}</p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="space-y-1.5">
                  {selectedSeats.map((seat) => (
                    <div key={seat.id} className="flex items-center justify-between text-sm font-semibold text-slate-600">
                      <span>Seat {seat.label}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(seat.price, layout?.currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-emerald-100 pt-3">
                  <span className="text-sm font-bold text-emerald-800">Take from passenger</span>
                  <span className="text-2xl font-black text-slate-900">{formatCurrency(selectedTotal, layout?.currency)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Passenger name"
                  value={passengerForm.name}
                  onChange={(e) => setPassengerForm((f) => ({ ...f, name: e.target.value }))}
                  className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 outline-none focus:border-[color:var(--app-primary,#FF6B00)]"
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Mobile number"
                  value={passengerForm.phone}
                  onChange={(e) => setPassengerForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                  className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 outline-none focus:border-[color:var(--app-primary,#FF6B00)]"
                />
                <input
                  type="number"
                  min={1}
                  max={120}
                  placeholder="Age"
                  value={passengerForm.age}
                  onChange={(e) => setPassengerForm((f) => ({ ...f, age: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 outline-none focus:border-[color:var(--app-primary,#FF6B00)]"
                />
                <select
                  value={passengerForm.gender}
                  onChange={(e) => setPassengerForm((f) => ({ ...f, gender: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 outline-none focus:border-[color:var(--app-primary,#FF6B00)]"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={passengerForm.notes}
                  onChange={(e) => setPassengerForm((f) => ({ ...f, notes: e.target.value }))}
                  className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-900 outline-none focus:border-[color:var(--app-primary,#FF6B00)]"
                />
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={handleReserveSeats}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[color:var(--app-primary,#FF6B00)] to-[#E53935] py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-60 cursor-pointer"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>{submitting ? 'Booking...' : `Money received • Book (${formatCurrency(selectedTotal, layout?.currency)})`}</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit profile (name + email) ── */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] flex items-end justify-center bg-slate-950/40 backdrop-blur-[2px]"
            onClick={() => !savingProfile && setIsEditProfileOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-[28px] bg-white px-5 pb-8 pt-3 shadow-2xl"
            >
              <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-200" />
              <div className="mt-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Edit profile</h3>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  aria-label="Close"
                  className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    {profileForm.profileImage ? (
                      <img src={profileForm.profileImage} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-slate-400"><User size={34} strokeWidth={1.6} /></span>
                    )}
                    {photoUploading ? (
                      <span className="absolute inset-0 grid place-items-center bg-white/70"><Loader2 size={20} className="animate-spin text-slate-600" /></span>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <label className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 active:scale-[0.98]">
                      {profileForm.profileImage ? 'Change photo' : 'Add photo'}
                      <input type="file" accept="image/*" className="hidden" onChange={onPhotoPicked} disabled={photoUploading} />
                    </label>
                    {profileForm.profileImage ? (
                      <button
                        type="button"
                        onClick={() => setProfileForm((form) => ({ ...form, profileImage: '' }))}
                        className="ml-2 text-sm font-bold text-rose-500 cursor-pointer"
                      >
                        Remove
                      </button>
                    ) : null}
                    <p className="mt-1.5 text-[11px] font-medium text-slate-400">A clear face photo. Max a few MB.</p>
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-500">Full name</span>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-900 outline-none focus:border-[color:var(--app-primary,#FF6B00)]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500">Email (optional)</span>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="name@gmail.com"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-900 outline-none focus:border-[color:var(--app-primary,#FF6B00)]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500">Mobile number</span>
                  <input
                    type="text"
                    value={profile?.phone || ''}
                    disabled
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 p-3 text-sm font-semibold text-slate-500"
                  />
                  <span className="mt-1 block text-[11px] font-medium text-slate-400">
                    This is your login number. Ask the bus owner or admin if it must change.
                  </span>
                </label>
              </div>

              <button
                type="button"
                disabled={savingProfile || photoUploading}
                onClick={handleSaveProfile}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
              >
                {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {savingProfile ? 'Saving...' : 'Save changes'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Logout confirmation ── */}
      <AnimatePresence>
        {isLogoutConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 px-5 backdrop-blur-sm"
            onClick={() => setIsLogoutConfirmOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-[28px] border border-slate-100 bg-white p-6 shadow-2xl"
            >
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-bold tracking-tight text-slate-900">Logout</h3>
                <p className="text-sm font-medium text-slate-500">Are you sure you want to logout?</p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  className="h-12 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={doLogout}
                  className="h-12 rounded-2xl bg-rose-500 text-sm font-bold text-white cursor-pointer"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Contact support ── */}
      <AnimatePresence>
        {isContactModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] flex items-end justify-center bg-slate-950/40 backdrop-blur-[2px]"
            onClick={() => setIsContactModalOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-[28px] bg-white px-5 pb-8 pt-3 shadow-2xl"
            >
              <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-200" />
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Contact support</h3>
                  <p className="text-xs font-medium text-slate-500">Your message goes to the admin panel.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  aria-label="Close"
                  className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-semibold text-slate-500">Your message</span>
                <textarea
                  rows={4}
                  placeholder="Write your problem or request here"
                  value={supportNote}
                  onChange={(e) => setSupportNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-900 outline-none focus:border-[color:var(--app-primary,#FF6B00)]"
                />
              </label>

              <button
                type="button"
                disabled={isSendingSupport}
                onClick={async () => {
                  const messageText = supportNote.trim();
                  if (messageText.length < 5) {
                    toast.error('Please write your message first');
                    return;
                  }
                  setIsSendingSupport(true);
                  try {
                    await createDriverSupportTicket({ title: 'Bus captain support request', message: messageText });
                    toast.success('Message sent to admin');
                    setIsContactModalOpen(false);
                    setSupportNote('');
                  } catch (err) {
                    const displayMsg =
                      typeof err === 'string'
                        ? err
                        : err?.response?.data?.message || err?.error || err?.message || 'Unable to send message';
                    toast.error(String(displayMsg).slice(0, 100));
                  } finally {
                    setIsSendingSupport(false);
                  }
                }}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
              >
                {isSendingSupport ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {isSendingSupport ? 'Sending...' : 'Send message'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BusDriverHome;
