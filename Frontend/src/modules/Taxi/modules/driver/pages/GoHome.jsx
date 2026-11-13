import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Loader2, LocateFixed, MapPin, Navigation, Search, Square } from 'lucide-react';
import {
  getGoHomeState,
  saveGoHomeLocation,
  startGoHome,
  stopGoHome,
} from '../services/registrationService';
import { useAppGoogleMapsLoader } from '../../admin/utils/googleMaps';

const unwrap = (response) => response?.data?.data || response?.data || response || {};
const errorText = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const formatKm = (meters) => {
  if (!Number.isFinite(meters)) return '--';
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
};

const formatRemaining = (expiresAt) => {
  if (!expiresAt) return '';
  const minutes = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000));
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m left`;
  return `${minutes} min left`;
};

const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not available on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => reject(new Error('Could not read your location. Please allow location access.')),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });

const GoHome = () => {
  const navigate = useNavigate();
  const { isLoaded: mapsLoaded } = useAppGoogleMapsLoader();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [address, setAddress] = useState('');

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      setState(unwrap(await getGoHomeState()));
    } catch (error) {
      if (!quiet) setMessage({ type: 'error', text: errorText(error, 'Unable to load Go Home') });
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // While the mode is on, keep distance / time left fresh (the backend also switches it off on arrival).
  useEffect(() => {
    if (!state?.active) return undefined;
    const timer = setInterval(() => load({ quiet: true }), 30000);
    return () => clearInterval(timer);
  }, [state?.active, load]);

  const run = async (key, task, successText) => {
    setBusy(key);
    setMessage({ type: '', text: '' });
    try {
      setState(unwrap(await task()));
      if (successText) setMessage({ type: 'success', text: successText });
    } catch (error) {
      setMessage({ type: 'error', text: errorText(error, 'Something went wrong') });
    } finally {
      setBusy('');
    }
  };

  const saveHere = () =>
    run('save', async () => {
      const position = await getCurrentPosition();
      return saveGoHomeLocation({ coordinates: [position.lng, position.lat], label: 'My current location' });
    }, 'Home location saved.');

  const searchAddress = () => {
    const query = address.trim();
    if (!query) return;
    if (!mapsLoaded || !window.google?.maps?.Geocoder) {
      setMessage({ type: 'error', text: 'Address search is not available. Use "Use my current location" instead.' });
      return;
    }
    run('save', () => new Promise((resolve, reject) => {
      new window.google.maps.Geocoder().geocode({ address: query }, (results, status) => {
        const location = results?.[0]?.geometry?.location;
        if (status !== 'OK' || !location) {
          reject(new Error('We could not find that address. Try adding the area and city.'));
          return;
        }
        resolve(saveGoHomeLocation({
          coordinates: [location.lng(), location.lat()],
          label: results[0].formatted_address || query,
        }));
      });
    }), 'Home location saved.');
  };

  const canStart = state && state.featureEnabled && state.hasHome && !state.active && state.remainingUses > 0;

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/taxi/driver/profile')}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm"
            aria-label="Back to account"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Go Home</h1>
            <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">Rides on your way home</p>
          </div>
        </div>
      </header>

      <main className="space-y-6 px-6 pt-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : !state ? (
          <p className="py-10 text-center text-sm text-red-500">{message.text || 'Unable to load Go Home'}</p>
        ) : (
          <>
            {!state.featureEnabled ? (
              <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">Go Home is not available right now.</p>
            ) : null}

            {state.active ? (
              <section className="rounded-3xl bg-slate-900 p-6 text-white">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><Navigation size={20} /></div>
                  <div>
                    <p className="text-lg font-bold">Go Home is ON</p>
                    <p className="text-xs text-white/60">You only get rides heading towards home.</p>
                  </div>
                </div>
                <div className="mb-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Distance to home</p>
                    <p className="mt-1 text-lg font-bold">{formatKm(state.distanceToHomeMeters)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Mode ends</p>
                    <p className="mt-1 text-lg font-bold">{formatRemaining(state.expiresAt)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy === 'stop'}
                  onClick={() => run('stop', stopGoHome, 'Go Home stopped. You will get all rides again.')}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-slate-900 disabled:opacity-60"
                >
                  {busy === 'stop' ? <Loader2 size={16} className="animate-spin" /> : <Square size={14} fill="currentColor" />}
                  Stop Go Home
                </button>
              </section>
            ) : (
              <section className="rounded-3xl bg-gray-50 p-6">
                <p className="text-base font-bold text-gray-900">Heading home for the day?</p>
                <p className="mt-1 text-sm text-gray-500">
                  Turn on Go Home and you will only be offered rides that take you towards home.
                </p>
                <button
                  type="button"
                  disabled={!canStart || busy === 'start'}
                  onClick={() => run('start', startGoHome, 'Go Home started.')}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-sm font-bold text-white disabled:opacity-40"
                >
                  {busy === 'start' ? <Loader2 size={16} className="animate-spin" /> : <Home size={16} />}
                  Start Go Home
                </button>
                <p className="mt-3 text-center text-xs text-gray-400">
                  {state.remainingUses} of {state.maxUsesPerDay} uses left today
                  {!state.hasHome ? ' · Set your home location below first' : ''}
                </p>
              </section>
            )}

            {message.text ? (
              <p className={`rounded-2xl px-4 py-3 text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                {message.text}
              </p>
            ) : null}

            <section className="rounded-3xl border border-gray-100 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100"><MapPin size={18} /></div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Home location</p>
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {state.hasHome ? state.label || 'Saved location' : 'Not set'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') searchAddress(); }}
                  placeholder="Search your home address"
                  className="min-w-0 flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={searchAddress}
                  disabled={busy === 'save' || !address.trim()}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black text-white disabled:opacity-40"
                  aria-label="Search address"
                >
                  {busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </button>
              </div>
              <button
                type="button"
                onClick={saveHere}
                disabled={busy === 'save'}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-800 disabled:opacity-50"
              >
                <LocateFixed size={16} /> Use my current location
              </button>
              {state.active ? (
                <p className="mt-3 text-xs text-amber-600">Changing home will stop Go Home. Start it again afterwards.</p>
              ) : null}
            </section>

            <section className="rounded-3xl bg-gray-50 p-5">
              <p className="mb-3 text-sm font-bold text-gray-900">How it works</p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>&bull; Only rides that move you closer to home are offered.</li>
                <li>&bull; Pickup and drop must stay within about {state.corridorWidthKm} km of your route home.</li>
                <li>&bull; The ride must head in your direction (within {state.coneAngleDegrees}&deg;).</li>
                <li>&bull; It switches off when you reach home or after {Math.round(state.maxDurationMinutes / 60 * 10) / 10} hours.</li>
                <li>&bull; You must be online to use it.</li>
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default GoHome;
