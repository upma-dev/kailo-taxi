import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Car, CheckCircle2, Clock, Loader2, Users } from 'lucide-react';
import { userService } from '../../services/userService';
import { rememberPostLoginRedirect } from '../../utils/postLoginRedirect';
import PoolingPlaceInput from '../pooling/PoolingPlaceInput';

const inputClass =
  'w-full rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-[13px] font-bold text-slate-900 outline-none transition focus:border-slate-400 placeholder:text-slate-400';
const placeInputClass =
  'w-full rounded-[14px] border border-slate-200 bg-white py-3 pl-11 text-[13px] font-bold text-slate-900 outline-none transition focus:border-slate-400 placeholder:text-slate-400';
// A pickup or drop point farther than this from where the rider is now is treated as a wrong pick.
const MAX_DISTANCE_KM = 50;

const distanceKm = (a, b) => {
  const rad = (deg) => (deg * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

const currentPosition = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000 },
    );
  });

const labelClass = 'mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400';

const readStoredUserInfo = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem('userInfo') || '{}');
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
};

const toLocalInput = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Separate date and time pickers. Emits "YYYY-MM-DDTHH:mm" once both are chosen, and never a moment before `min`.
const DateTimeFields = ({ label, value, min, onChange }) => {
  const [date, setDate] = useState(value ? value.slice(0, 10) : '');
  const [time, setTime] = useState(value ? value.slice(11, 16) : '');
  const [minDate, minClock] = [min.slice(0, 10), min.slice(11, 16)];

  const tooEarly = (d, t) => Boolean(d && t && `${d}T${t}` < min);
  // While typing, the value passes through half-typed years (0002, 0020...), so nothing is corrected until the field loses focus.
  const push = (nextDate, nextTime) => onChange(nextDate && nextTime && !tooEarly(nextDate, nextTime) ? `${nextDate}T${nextTime}` : '');

  const changeDate = (picked) => {
    setDate(picked);
    push(picked, time);
  };
  const changeTime = (picked) => {
    setTime(picked);
    push(date, picked);
  };

  const fixDate = () => {
    if (date && date < minDate) {
      toast.error('That date has already passed. Choose today or a later date.');
      setDate(minDate);
      push(minDate, time);
    }
  };
  const fixTime = () => {
    if (date && date === minDate && time && time < minClock) {
      toast.error(`Choose a time after ${minClock} for today.`);
      setTime(minClock);
      push(date, minClock);
    }
  };

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="grid grid-cols-2 gap-3">
        <input type="date" min={minDate} value={date} onChange={(event) => changeDate(event.target.value)} onBlur={fixDate} className={inputClass} aria-label={`${label} - date`} />
        <input type="time" value={time} onChange={(event) => changeTime(event.target.value)} onBlur={fixTime} className={inputClass} aria-label={`${label} - time`} />
      </div>
    </div>
  );
};

// Book a vehicle with a driver, or send a custom quote request for it. Both reach the admin and the service centers.
const RentalDriverBook = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const vehicle = location.state?.vehicle || null;
  const user = useMemo(() => readStoredUserInfo(), []);
  const [tab, setTab] = useState(location.state?.tab === 'quote' ? 'quote' : 'book');
  const [packageId, setPackageId] = useState(vehicle?.packages?.[0]?.id || '');
  const minTime = useMemo(() => toLocalInput(new Date(Date.now() + 30 * 60 * 1000)), []);
  const [form, setForm] = useState({
    pickupDateTime: '',
    returnDateTime: '',
    pickupLocation: '',
    dropLocation: '',
    notes: '',
    requestedHours: '',
    seatsNeeded: '',
    contactName: user.name || '',
    contactPhone: String(user.phone || '').replace(/\D/g, '').slice(-10),
  });
  const [pickupPlace, setPickupPlace] = useState(null);
  const [dropPlace, setDropPlace] = useState(null);
  const [farWarning, setFarWarning] = useState({ pickup: '' });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState('');

  if (!vehicle) {
    navigate('/taxi/user/rental', { replace: true });
    return null;
  }

  const selected = vehicle.packages.find((pkg) => pkg.id === packageId) || null;
  // After a place is picked, compare it with the rider's own location and warn when it is too far.
  const checkDistance = async (field, place) => {
    setFarWarning((current) => ({ ...current, [field]: '' }));
    if (!place || place.lat === undefined) return;
    const here = await currentPosition();
    if (!here) return;
    const km = Math.round(distanceKm(here, place));
    if (km > MAX_DISTANCE_KM) {
      setFarWarning((current) => ({ ...current, [field]: `This place is about ${km} km from your current location, which is too far. Please select a pickup location closer to where you are.` }));
    }
  };

  // Drop point must fit the chosen package's km limit (measured in a straight line from the pickup).
  const dropWarning = (() => {
    if (tab !== 'book' || !selected?.kmLimit || !pickupPlace?.lat || !dropPlace?.lat) return '';
    const km = Math.round(distanceKm(pickupPlace, dropPlace));
    return km > selected.kmLimit
      ? `Drop is about ${km} km from the pickup, but the "${selected.label}" package covers only ${selected.kmLimit} km. Please select a drop location within your package limit, or choose a bigger package.`
      : '';
  })();

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const validateCommon = () => {
    if (!form.contactName.trim()) return 'Enter your name.';
    if (String(form.contactPhone).replace(/\D/g, '').length !== 10) return 'Enter a valid 10-digit phone number.';
    if (!form.pickupDateTime) return 'Choose the pickup date and time.';
    if (new Date(form.pickupDateTime) < new Date()) return 'Pickup time must be in the future.';
    if (!form.pickupLocation.trim()) return 'Enter the pickup location.';
    if (farWarning.pickup) return 'The pickup location is too far from you. Select a nearer one.';
    if (dropWarning) return 'The drop location is outside your package. Select a closer drop or a bigger package.';
    return '';
  };

  const submit = async () => {
    const problem = validateCommon() || (tab === 'book' && !selected ? 'Choose a package.' : '');
    if (problem) return toast.error(problem);

    setSending(true);
    try {
      if (tab === 'book') {
        await userService.createRentalDriverBooking({
          driverVehicleId: vehicle.id,
          packageId: selected.id,
          pickupDateTime: form.pickupDateTime,
          pickupLocation: form.pickupLocation,
          dropLocation: form.dropLocation,
          notes: form.notes,
          contactName: form.contactName,
          contactPhone: form.contactPhone,
        });
        setDone('Booking request sent. The service center will confirm it and assign your driver. You can follow it on the rental page.');
      } else {
        await userService.createRentalQuoteRequest({
          driverVehicleId: vehicle.id,
          serviceMode: 'with_driver',
          contactName: form.contactName,
          contactPhone: form.contactPhone,
          requestedHours: Number(form.requestedHours || 0),
          seatsNeeded: Number(form.seatsNeeded || 1),
          pickupDateTime: form.pickupDateTime,
          returnDateTime: form.returnDateTime || null,
          pickupLocation: form.pickupLocation,
          dropLocation: form.dropLocation,
          specialRequirements: form.notes,
        });
        setDone('Custom quote request sent. We will reply with a price and you can see it on the rental page.');
      }
    } catch (error) {
      // Not signed in (or the session ended): send the rider to sign in and bring them back here afterwards.
      if (error?.status === 401 || error?.response?.status === 401) {
        rememberPostLoginRedirect(`${location.pathname}${location.search || ''}`, { ...(location.state || {}), tab });
        navigate('/taxi/user/login');
        return;
      }
      toast.error(error?.response?.data?.message || error?.message || 'Could not send your request.');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-5 bg-[#F3F4F6] px-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 size={34} />
        </span>
        <h1 className="text-xl font-black text-slate-900">Request sent</h1>
        <p className="text-sm font-semibold leading-relaxed text-slate-500">{done}</p>
        <button
          type="button"
          onClick={() => navigate('/taxi/user/rental', { replace: true })}
          className="w-full rounded-[18px] bg-slate-900 py-4 text-[15px] font-black text-white"
        >
          Back to rentals
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-[linear-gradient(180deg,#F8FAFC_0%,#F3F4F6_38%,#EEF2F7_100%)] pb-32">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/80 bg-white/90 px-5 pb-4 pt-10 backdrop-blur-md">
        <button type="button" onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-slate-200 bg-white">
          <ArrowLeft size={18} className="text-slate-900" strokeWidth={2.5} />
        </button>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.26em] text-slate-400">Rental with driver</p>
          <h1 className="truncate text-[18px] font-black text-slate-900">{vehicle.name}</h1>
        </div>
      </header>

      <div className="space-y-4 px-5 pt-4">
        <div className="flex items-center gap-3 rounded-[20px] border border-white/80 bg-white/90 p-3 shadow-sm">
          {vehicle.image ? (
            <img src={vehicle.image} alt={vehicle.name} className="h-14 w-20 object-contain" />
          ) : (
            <span className="flex h-14 w-20 items-center justify-center rounded-xl bg-slate-100 text-slate-300"><Car size={24} /></span>
          )}
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-slate-500">{vehicle.vehicleCategory} · a driver comes with it</p>
            <p className="flex items-center gap-1 text-[12px] font-bold text-slate-500"><Users size={12} /> {vehicle.capacity} seats</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 rounded-[18px] border border-slate-200 bg-white p-1.5">
          {[{ key: 'book', label: 'Book a package' }, { key: 'quote', label: 'Custom Quote' }].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setTab(option.key)}
              className={`rounded-[14px] py-3 text-[13px] font-black transition ${tab === option.key ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {tab === 'book' ? (
          <div className="space-y-2">
            <span className={labelClass}>Package</span>
            {vehicle.packages.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setPackageId(pkg.id)}
                className={`flex w-full items-center justify-between rounded-[16px] border px-4 py-3 text-left transition ${
                  packageId === pkg.id ? 'border-slate-900 bg-white shadow-md' : 'border-slate-200 bg-white/70'
                }`}
              >
                <span>
                  <span className="flex items-center gap-1.5 text-[13px] font-black text-slate-900"><Clock size={13} className="text-slate-400" />{pkg.label}</span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-slate-400">
                    {pkg.extraHourPrice > 0 ? `Extra hour ₹${pkg.extraHourPrice}` : ''}
                    {pkg.extraHourPrice > 0 && pkg.extraKmPrice > 0 ? ' · ' : ''}
                    {pkg.extraKmPrice > 0 ? `Extra km ₹${pkg.extraKmPrice}` : ''}
                  </span>
                </span>
                <span className="text-[18px] font-black text-slate-900">₹{pkg.price}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-[16px] border border-violet-100 bg-violet-50/80 px-4 py-3 text-[12px] font-bold leading-relaxed text-violet-800">
            Need a different time, route or number of days? Tell us what you need and we will reply with a price.
          </p>
        )}

        <div className="space-y-3 rounded-[20px] border border-white/80 bg-white/90 p-4 shadow-sm">
          <DateTimeFields label="Pickup date and time" value={form.pickupDateTime} min={minTime} onChange={(value) => set({ pickupDateTime: value })} />
          {tab === 'quote' ? (
            <>
              <DateTimeFields key={form.pickupDateTime} label="Return date and time (optional)" value={form.returnDateTime} min={form.pickupDateTime || minTime} onChange={(value) => set({ returnDateTime: value })} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Hours needed</label>
                  <input type="number" min="0" value={form.requestedHours} onChange={(event) => set({ requestedHours: event.target.value })} className={inputClass} placeholder="e.g. 10" />
                </div>
                <div>
                  <label className={labelClass}>People</label>
                  <input type="number" min="1" value={form.seatsNeeded} onChange={(event) => set({ seatsNeeded: event.target.value })} className={inputClass} placeholder="e.g. 4" />
                </div>
              </div>
            </>
          ) : null}
          <div>
            <label className={labelClass}>Pickup location</label>
            <PoolingPlaceInput
              value={pickupPlace}
              onChange={(place) => { setPickupPlace(place); if (place) set({ pickupLocation: place.label }); checkDistance('pickup', place); }}
              onTextChange={(text) => { set({ pickupLocation: text }); setFarWarning((current) => ({ ...current, pickup: '' })); }}
              placeholder="Where should the driver come?"
              accentClass="text-emerald-500"
              allowCurrentLocation
              inputClassName={placeInputClass}
            />
            {farWarning.pickup ? <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-rose-700">{farWarning.pickup}</p> : null}
          </div>
          <div>
            <label className={labelClass}>Drop location (optional)</label>
            <PoolingPlaceInput
              value={dropPlace}
              onChange={(place) => { setDropPlace(place); if (place) set({ dropLocation: place.label }); }}
              onTextChange={(text) => { set({ dropLocation: text }); }}
              placeholder="Where are you going?"
              accentClass="text-rose-500"
              allowCurrentLocation
              inputClassName={placeInputClass}
            />
            {dropWarning ? <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-rose-700">{dropWarning}</p> : null}
          </div>
          <div>
            <label className={labelClass}>{tab === 'quote' ? 'What do you need?' : 'Notes for the driver (optional)'}</label>
            <textarea rows="3" value={form.notes} onChange={(event) => set({ notes: event.target.value })} className={inputClass} placeholder={tab === 'quote' ? 'Route, days, stops, anything special' : 'Anything the driver should know'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Your name</label>
              <input value={form.contactName} onChange={(event) => set({ contactName: event.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input value={form.contactPhone} onChange={(event) => set({ contactPhone: event.target.value })} inputMode="numeric" className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-lg -translate-x-1/2 bg-gradient-to-t from-[#EEF2F7] via-[#F3F4F6]/95 to-transparent px-5 pb-6 pt-3">
        <button
          type="button"
          disabled={sending}
          onClick={submit}
          className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-slate-900 py-4 text-[15px] font-black text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)] disabled:opacity-60"
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : null}
          {tab === 'book' ? `Send booking request${selected ? ` · ₹${selected.price}` : ''}` : 'Send quote request'}
        </button>
      </div>
    </div>
  );
};

export default RentalDriverBook;
