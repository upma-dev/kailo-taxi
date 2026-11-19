import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Car, ChevronRight, Clock, MessageSquareQuote, Phone, UserRound, Users } from 'lucide-react';
import { userService } from '../services/userService';

const unwrap = (response) => response?.data?.data || response?.data || response || {};

const STATUS_VIEW = {
  pending: { label: 'Waiting for confirmation', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmed', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  assigned: { label: 'Driver assigned', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Completed', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

const searchText = (vehicle) =>
  [vehicle.name, vehicle.vehicleCategory, vehicle.description, ...(vehicle.amenities || []), ...(vehicle.packages || []).map((pkg) => pkg.label)]
    .join(' ')
    .toLowerCase();

// "Rental with Driver": its own vehicles and packages (separate from the self-drive rentals), plus the rider's bookings.
const DriverRentalList = ({ searchQuery = '' }) => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState('');
  const [returningId, setReturningId] = useState('');

  const loadBookings = useCallback(async () => {
    try {
      const data = unwrap(await userService.getMyRentalDriverBookings());
      setBookings(Array.isArray(data.results) ? data.results : []);
    } catch {
      // Not signed in, or rental is off: just show no bookings.
      setBookings([]);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    userService
      .getRentalDriverVehicles()
      .then((response) => {
        if (alive) setVehicles(Array.isArray(unwrap(response).results) ? unwrap(response).results : []);
      })
      .catch((err) => alive && setError(err?.message || 'Could not load vehicles with driver.'))
      .finally(() => alive && setLoading(false));
    loadBookings();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadBookings();
    }, 30000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [loadBookings]);

  const query = String(searchQuery || '').trim().toLowerCase();
  const visible = useMemo(() => (query ? vehicles.filter((vehicle) => searchText(vehicle).includes(query)) : vehicles), [vehicles, query]);

  const open = (vehicle, tab) => navigate('/taxi/user/rental/driver', { state: { vehicle, tab } });

  const endTrip = async (booking) => {
    if (!window.confirm('Has the trip ended and the vehicle come back?')) return;
    setReturningId(booking.id);
    try {
      await userService.returnRentalDriverBooking(booking.id);
      toast.success('The service center has been told the trip ended');
      await loadBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Could not send this.');
    } finally {
      setReturningId('');
    }
  };

  const cancel = async (booking) => {
    if (!window.confirm('Cancel this booking?')) return;
    setCancellingId(booking.id);
    try {
      await userService.cancelRentalDriverBooking(booking.id);
      toast.success('Booking cancelled');
      await loadBookings();
    } catch (err) {
      toast.error(err?.message || 'Could not cancel the booking.');
    } finally {
      setCancellingId('');
    }
  };

  return (
    <div className="space-y-4">
      {bookings.length > 0 ? (
        <div className="space-y-3 rounded-[20px] border border-white/80 bg-white/90 px-5 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-2">
            <UserRound size={14} className="text-slate-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Your bookings with driver</p>
          </div>
          {bookings.slice(0, 5).map((booking) => {
            const view = STATUS_VIEW[booking.status] || STATUS_VIEW.pending;
            const canCancel = ['pending', 'confirmed', 'assigned'].includes(booking.status);
            return (
              <div key={booking.id} className="space-y-1.5 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-black text-slate-900">{booking.vehicleName}</p>
                    <p className="text-[11px] font-semibold text-slate-500">
                      {booking.selectedPackage?.label} - Rs.{booking.totalCost} - {formatDateTime(booking.pickupDateTime)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${view.cls}`}>{view.label}</span>
                </div>
                {booking.assignedDriver?.name ? (
                  <p className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-700">
                    <Phone size={12} /> Your driver: {booking.assignedDriver.name}
                    {booking.assignedDriver.phone ? ` - ${booking.assignedDriver.phone}` : ''}
                  </p>
                ) : null}
                {booking.note ? <p className="text-[11px] font-semibold text-slate-500">Message: {booking.note}</p> : null}
                {booking.status === 'cancelled' && booking.cancelReason ? (
                  <p className="text-[11px] font-semibold text-rose-600">Reason: {booking.cancelReason}</p>
                ) : null}
                {booking.status === 'assigned' && !booking.returnRequestedAt ? (
                  <button
                    type="button"
                    disabled={returningId === booking.id}
                    onClick={() => endTrip(booking)}
                    className="mr-4 text-[11px] font-black uppercase tracking-wider text-emerald-700 disabled:opacity-50"
                  >
                    {returningId === booking.id ? 'Sending...' : 'Trip ended - vehicle returned'}
                  </button>
                ) : null}
                {booking.status === 'assigned' && booking.returnRequestedAt ? (
                  <p className="text-[11px] font-bold text-emerald-700">You told the center the trip ended. They will close the booking.</p>
                ) : null}
                {canCancel && !booking.returnRequestedAt ? (
                  <button
                    type="button"
                    disabled={cancellingId === booking.id}
                    onClick={() => cancel(booking)}
                    className="text-[11px] font-black uppercase tracking-wider text-rose-500 disabled:opacity-50"
                  >
                    {cancellingId === booking.id ? 'Cancelling...' : 'Cancel booking'}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">Rental with driver</p>
        <h2 className="mt-0.5 text-[16px] font-black tracking-tight text-slate-900">Choose a vehicle and a package</h2>
      </div>

      {loading ? (
        <div className="rounded-[24px] border border-white/80 bg-white/90 p-5 text-[13px] font-bold text-slate-400">Loading vehicles...</div>
      ) : error ? (
        <div className="rounded-[24px] border border-rose-100 bg-rose-50/90 p-5 text-[13px] font-bold text-rose-500">{error}</div>
      ) : visible.length === 0 ? (
        <div className="rounded-[24px] border border-white/80 bg-white/90 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] bg-slate-100 text-slate-400">
            <Car size={22} />
          </div>
          <p className="mt-4 text-[15px] font-black text-slate-900">{query ? 'Nothing matched your search' : 'No vehicles with driver yet'}</p>
          <p className="mt-1 text-[12px] font-bold text-slate-400">{query ? 'Try another name or category.' : 'Please check again soon.'}</p>
        </div>
      ) : (
        visible.map((vehicle, index) => {
          const cheapest = vehicle.packages.reduce((min, pkg) => (min === null || pkg.price < min ? pkg.price : min), null);
          return (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className="overflow-hidden rounded-[24px] border border-white/80 bg-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-center justify-between px-4 pb-3 pt-3.5" style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #FFFFFF 100%)' }}>
                <div className="min-w-0 flex-1 space-y-1 pr-2">
                  <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-black text-violet-700">
                    {vehicle.vehicleCategory} · With driver
                  </span>
                  <h3 className="text-[15px] font-black leading-tight tracking-tight text-slate-900">{vehicle.name}</h3>
                  {vehicle.description ? <p className="text-[10px] font-bold text-slate-500">{vehicle.description}</p> : null}
                  <p className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                    <Users size={11} /> {vehicle.capacity} seats{vehicle.luggageCapacity ? ` · ${vehicle.luggageCapacity} bags` : ''}
                  </p>
                </div>
                {vehicle.image ? (
                  <img src={vehicle.image} alt={vehicle.name} className="-my-2 h-20 w-24 shrink-0 object-contain drop-shadow-lg" />
                ) : (
                  <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-[20px] bg-white/70 text-slate-300">
                    <Car size={28} />
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t border-slate-50 px-4 pb-4 pt-3">
                {vehicle.amenities.length ? (
                  <div className="flex flex-wrap gap-1">
                    {vehicle.amenities.map((amenity) => (
                      <span key={amenity} className="rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[9px] font-black text-slate-500">
                        {amenity}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  {vehicle.packages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                        <Clock size={11} className="text-slate-400" /> {pkg.label}
                      </span>
                      <span className="text-[13px] font-black text-slate-900">₹{pkg.price}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Starts at</span>
                    <span className="text-[22px] font-black leading-none tracking-tighter text-slate-900">₹{cheapest}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => open(vehicle, 'quote')}
                      className="flex items-center gap-1 rounded-[12px] border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-600"
                    >
                      <MessageSquareQuote size={13} strokeWidth={2.6} /> Quote
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => open(vehicle, 'book')}
                      className="flex items-center gap-1 rounded-[12px] bg-slate-900 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-[0_6px_16px_rgba(15,23,42,0.18)]"
                    >
                      Book Now <ChevronRight size={13} strokeWidth={3} className="opacity-60" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
};

export default DriverRentalList;
