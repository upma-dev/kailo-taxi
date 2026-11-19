import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, MapPin, Clock, Camera, Home, Upload } from 'lucide-react';
import { useSettings } from '../../../../shared/context/SettingsContext';
import { userService } from '../../services/userService';
import { resolveAssetUrl } from '../../components/useVehicleTiles';
import { saveCurrentRide, clearCurrentRide } from '../../services/currentRideService';

const buildRentalBookingPayload = ({
  state,
  vehicle,
  bookingReference,
}) => ({
  bookingReference,
  serviceMode: state.serviceMode === 'with_driver' ? 'with_driver' : 'self_drive',
  vehicleTypeId: vehicle.id || vehicle._id,
  pickupDateTime: state.pickup,
  returnDateTime: state.returnTime,
  totalCost: Number(state.totalCost || 0),
  payableNow: Number(state.deposit || 0),
  advancePaymentLabel: state.paymentOption === 'safety_money' ? 'Refundable safety money' : state.vehicle?.advancePayment?.label || 'Advance booking payment',
  paymentOption: state.paymentOption || 'advance',
  paymentStatus: state.paymentStatus || 'pending',
  paymentMethod: state.paymentMethod || '',
  paymentMethodLabel: state.paymentMethodLabel || '',
  payment: state.payment || {
    provider: state.paymentMethodLabel ? 'razorpay' : 'manual',
    status: state.paymentStatus || 'pending',
    amount: Number(state.deposit || 0),
    currency: 'INR',
  },
  kycCompleted: true,
  kycDocuments: state.rentalKyc?.documents || null,
  conditionPhoto: state.conditionPhoto || null,
  selectedPackage: state.selectedPackage
    ? {
        id: state.selectedPackage.id || state.selectedPackage._id || '',
        label: state.selectedPackage.label || '',
        durationHours: Number(state.selectedPackage.durationHours || 0),
        price: Number(state.selectedPackage.price || 0),
      }
    : null,
  serviceLocation: state.serviceLocation
    ? {
        id: state.serviceLocation.id || state.serviceLocation._id || '',
        name: state.serviceLocation.name || '',
        address: state.serviceLocation.address || '',
        city: state.serviceLocation.city || state.serviceLocation.country || '',
        latitude: state.serviceLocation.latitude,
        longitude: state.serviceLocation.longitude,
        distanceKm: state.serviceLocation.distanceKm,
      }
    : null,
});

const FALLBACK_DURATION_HOURS = {
  Hourly: 1,
  'Half-Day': 6,
  Daily: 24,
};

const durationSuffix = (hours) => {
  const value = Number(hours || 0);
  if (value <= 1) return '/hr';
  if (value <= 12) return `/${value}hr`;
  return '/day';
};

const resolveRentalPricingSummary = ({
  ride = {},
  vehicle = null,
  duration = 'Hourly',
} = {}) => {
  const selectedPackage = ride?.selectedPackage || null;
  const fallbackVehiclePrice =
    Number(vehicle?.prices?.[duration] || 0) ||
    Number(ride?.totalCost || 0) ||
    Number(ride?.advancePaid || ride?.payableNow || 0) ||
    0;
  const basePrice = Math.max(
    Number(ride?.basePrice || 0),
    Number(selectedPackage?.price || 0),
    fallbackVehiclePrice,
  );
  const includedHours = Math.max(
    Number(ride?.includedHours || 0),
    Number(selectedPackage?.durationHours || 0),
    Number(ride?.requestedHours || 0) > 0 && Number(ride?.extraHourRate || selectedPackage?.extraHourPrice || 0) <= 0
      ? Number(ride?.requestedHours || 0)
      : 0,
    Number(FALLBACK_DURATION_HOURS[duration] || 1),
  );
  const extraHourRate = Math.max(
    Number(ride?.extraHourRate || 0),
    Number(selectedPackage?.extraHourPrice || 0),
    0,
  );

  return {
    label: selectedPackage?.label || duration,
    basePrice,
    includedHours,
    extraHourRate,
    suffix: durationSuffix(selectedPackage?.durationHours || includedHours),
  };
};

// The bill grows with the running time (per second): hourly rate while inside the package, then the
// extra-hour rate. The advance already paid is the minimum. Same formula as the backend.
const computeRentalLiveCharge = (ride = {}, pricingSummary = {}, elapsedSeconds = 0) => {
  const elapsedHours = Math.max(0, Number(elapsedSeconds || 0) / 3600);
  // Safety money is not a minimum bill (it is refunded); a plain advance is.
  const advance = ride?.paymentOption === 'safety_money' ? 0 : Number(ride?.advancePaid || ride?.payableNow || 0);
  const basePrice = Math.max(Number(pricingSummary?.basePrice || 0), 0);
  const includedHours = Math.max(1, Number(pricingSummary?.includedHours || 0));
  const hourlyRate = basePrice / includedHours;
  const extraHourRate = Number(pricingSummary?.extraHourRate || 0) > 0 ? Number(pricingSummary.extraHourRate) : hourlyRate;
  // Safety money option: the package is always charged in full; only time beyond it adds to the bill.
  const packageCharge = elapsedHours <= includedHours
    ? (ride?.paymentOption === 'safety_money' ? basePrice : hourlyRate * elapsedHours)
    : basePrice + (elapsedHours - includedHours) * extraHourRate;

  return Math.max(advance, packageCharge);
};

// Testing aid: lets a tester "teleport" to the hub without really travelling there. Only in dev builds
// (or when VITE_ENABLE_MAP_SIMULATION=true); never shown in production.
const HUB_SIMULATOR_ENABLED =
  import.meta.env.DEV || String(import.meta.env.VITE_ENABLE_MAP_SIMULATION || '').toLowerCase() === 'true';

const RentalConfirmed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const appName = settings.general?.app_name || 'App';
  const state = location.state || {};
  const [clockNow, setClockNow] = useState(() => Date.now());

  // The page opens with a snapshot; keep it fresh from the server so the clock and the bill never go stale.
  const [freshRide, setFreshRide] = useState(null);
  const baseRentalRide = state?.serviceType === 'rental' && state?.rideId ? state : null;
  const activeRentalRide = baseRentalRide ? { ...baseRentalRide, ...(freshRide || {}) } : null;

  useEffect(() => {
    if (!baseRentalRide || baseRentalRide.summaryMode === 'completed' || baseRentalRide.completedAt) return undefined;
    let off = false;
    const refresh = async () => {
      try {
        const res = await userService.getActiveRentalBooking();
        const data = res?.id ? res : res?.data || null;
        if (off) return;
        if (data?.id && String(data.id) === String(baseRentalRide.rideId)) {
          setFreshRide({
            ...data,
            rideId: data.id,
            serviceType: 'rental',
            advancePaid: data.payableNow ?? baseRentalRide.advancePaid,
          });
          return;
        }

        // No longer an active rental: the admin may have ended it. Show the last step (final summary).
        const listRes = await userService.getMyRentalBookings({ page: 1, limit: 10 });
        const results = listRes?.data?.results || listRes?.results || [];
        const finished = results.find((item) => String(item?.id) === String(baseRentalRide.rideId));
        if (!off && finished && String(finished.status).toLowerCase() === 'completed') {
          clearCurrentRide();
          setFreshRide({
            ...finished,
            rideId: finished.id,
            serviceType: 'rental',
            summaryMode: 'completed',
            advancePaid: finished.payableNow ?? baseRentalRide.advancePaid,
            fare: finished.finalCharge,
          });
        }
      } catch {
        // keep the snapshot on a transient error
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => {
      off = true;
      window.clearInterval(timer);
    };
  }, [baseRentalRide?.rideId, baseRentalRide?.status]);
  const isCompletedRentalRide = Boolean(activeRentalRide?.completedAt || activeRentalRide?.summaryMode === 'completed' || state?.summaryMode === 'completed');
  
  useEffect(() => {
    if (isCompletedRentalRide) {
      clearCurrentRide();
    }
  }, [isCompletedRentalRide]);
  const isEndRequestPending = String(activeRentalRide?.status || '').toLowerCase() === 'end_requested' && !isCompletedRentalRide;
  const [distanceToHub, setDistanceToHub] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [simulatedAtHub, setSimulatedAtHub] = useState(false);

  useEffect(() => {
    if (!activeRentalRide || isCompletedRentalRide || isEndRequestPending) return undefined;

    let watchId;
    const hubLat = activeRentalRide?.serviceLocation?.latitude;
    const hubLon = activeRentalRide?.serviceLocation?.longitude;

    if (navigator.geolocation && hubLat && hubLon) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, hubLat, hubLon);
          setDistanceToHub(dist);
          setLocationError(null);
        },
        (err) => {
          console.error('Location error:', err);
          setLocationError('Please enable location access to end the ride.');
        },
        { enableHighAccuracy: true },
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [activeRentalRide, isCompletedRentalRide, isEndRequestPending]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // meters
    const q1 = (lat1 * Math.PI) / 180;
    const q2 = (lat2 * Math.PI) / 180;
    const dq = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dq / 2) * Math.sin(dq / 2) + Math.cos(q1) * Math.cos(q2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const isWithinHubRange = (HUB_SIMULATOR_ENABLED && simulatedAtHub) || (distanceToHub !== null && distanceToHub <= 100);

  useEffect(() => {
    if (!activeRentalRide || isCompletedRentalRide || isEndRequestPending) return undefined;

    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeRentalRide, isCompletedRentalRide, isEndRequestPending]);

  const {
    vehicle,
    duration,
    pickup,
    returnTime,
    totalCost,
    deposit,
    serviceLocation,
    selectedPackage,
    paymentMethodLabel,
    bookingReference,
  } = state;
  const bookingPricingSummary = resolveRentalPricingSummary({
    ride: { ...state, advancePaid: deposit },
    vehicle,
    duration: duration || 'Hourly',
  });
  // The clock starts when the vehicle was assigned; if the admin only confirmed the request, from that approval.
  const rentalStartedAt =
    activeRentalRide?.assignedAt ||
    activeRentalRide?.reviewedAt ||
    activeRentalRide?.createdAt ||
    null;
  const rentalStartMs = rentalStartedAt ? new Date(rentalStartedAt).getTime() : NaN;
  const liveElapsedSeconds = Number.isFinite(rentalStartMs)
    ? isEndRequestPending && Number(activeRentalRide?.finalElapsedMinutes || 0) > 0
      ? Number(activeRentalRide.finalElapsedMinutes || 0) * 60
      : Math.max(0, Math.floor((clockNow - rentalStartMs) / 1000))
    : Number(activeRentalRide?.elapsedMinutes || 0) * 60;
  const liveElapsedMinutes = Math.max(1, Math.ceil(liveElapsedSeconds / 60));

  const liveElapsedLabel = `${Math.floor(liveElapsedSeconds / 3600)}h ${String(Math.floor((liveElapsedSeconds % 3600) / 60)).padStart(2, '0')}m ${String(liveElapsedSeconds % 60).padStart(2, '0')}s`;
  const activePricingSummary = useMemo(
    () =>
      resolveRentalPricingSummary({
        ride: activeRentalRide || {},
        vehicle: activeRentalRide?.assignedVehicle || activeRentalRide?.vehicle || state.vehicle,
        duration: state.duration || 'Hourly',
      }),
    [activeRentalRide, state.duration, state.vehicle],
  );

  const liveCharge = activeRentalRide
    ? isEndRequestPending && Number(activeRentalRide?.finalCharge || 0) > 0
      ? Number(activeRentalRide.finalCharge || 0)
      : computeRentalLiveCharge(activeRentalRide, activePricingSummary, liveElapsedSeconds)
    : 0;
  const completedCharge = Number(activeRentalRide?.finalCharge || activeRentalRide?.fare || 0);
  const activeVehicleImage = resolveAssetUrl(
    activeRentalRide?.assignedVehicle?.image ||
    activeRentalRide?.vehicle?.image ||
    activeRentalRide?.vehicleImage ||
    state.vehicle?.image ||
    '',
  );
  const activeVehicleName =
    activeRentalRide?.assignedVehicle?.name ||
    activeRentalRide?.vehicle?.name ||
    activeRentalRide?.vehicleName ||
    state.vehicle?.name ||
    'Rental Vehicle';
  const activeVehicleCategory =
    activeRentalRide?.assignedVehicle?.vehicleCategory ||
    activeRentalRide?.vehicleCategory ||
    activeRentalRide?.driver?.vehicle ||
    state.vehicle?.vehicleCategory ||
    'Rental';
  const [conditionPhoto, setConditionPhoto] = useState(null);
  const [resolvedBookingReference, setResolvedBookingReference] = useState(bookingReference || '');
  const [endingRide, setEndingRide] = useState(false);
  const inputRef = useRef();
  const bookingId = resolvedBookingReference || `RNT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  useEffect(() => {
    if (activeRentalRide) {
      setResolvedBookingReference(activeRentalRide.bookingReference || '');
      return undefined;
    }

    let mounted = true;

    const ensureRentalBookingRequest = async () => {
      const alreadySaved = state.bookingRequest?.id || state.bookingRequest?._id || bookingReference;
      const canPersist =
        vehicle &&
        pickup &&
        returnTime &&
        ['paid', 'not_required'].includes(String(state.paymentStatus || '').toLowerCase());

      if (alreadySaved || !canPersist) {
        return;
      }

      try {
        const response = await userService.createRentalBookingRequest(
          buildRentalBookingPayload({
            state,
            vehicle,
            bookingReference: '',
          }),
        );
        const saved = response?.data || response || {};
        if (mounted && saved.bookingReference) {
          setResolvedBookingReference(saved.bookingReference);
        }
      } catch (error) {
        console.error('Could not persist rental booking from confirmation page', error);
      }
    };

    ensureRentalBookingRequest();

    return () => {
      mounted = false;
    };
  }, [activeRentalRide, bookingReference, pickup, returnTime, state, vehicle]);

  const finalTotal = useMemo(() => {
    if (isCompletedRentalRide) {
      return completedCharge;
    }
    return liveCharge;
  }, [completedCharge, isCompletedRentalRide, liveCharge]);

  const isSafetyOption = activeRentalRide?.paymentOption === 'safety_money';
  const safetyHeld = Number(activeRentalRide?.safetyMoney?.amount || activeRentalRide?.payableNow || 0);
  const safetySettled = activeRentalRide?.safetyMoney?.status === 'settled';
  const safetyDeducted = safetySettled ? Number(activeRentalRide.safetyMoney.deductedAmount || 0) : Math.min(finalTotal, safetyHeld);
  const safetyRefund = safetySettled ? Number(activeRentalRide.safetyMoney.refundedAmount || 0) : Math.max(0, safetyHeld - finalTotal);
  const safetyDue = safetySettled ? Number(activeRentalRide.safetyMoney.dueAmount || 0) : Math.max(0, finalTotal - safetyHeld);

  if (!state.vehicle && !activeRentalRide) {
    navigate('/taxi/user/rental');
    return null;
  }

  const handleEndRide = async () => {
    if (!activeRentalRide?.rideId) return;

    try {
      setEndingRide(true);
      const response = await userService.endRentalRide(activeRentalRide.rideId);
      const payload = response?.data || null;
      const nextRideState = {
        ...activeRentalRide,
        ...payload,
        rideId: payload?.id || activeRentalRide.rideId,
        fare: payload?.finalCharge || payload?.rideMetrics?.currentCharge || finalTotal,
        completionRequestedAt: payload?.completionRequestedAt || new Date().toISOString(),
        status: payload?.status || 'end_requested',
        liveStatus: payload?.status || 'end_requested',
        finalCharge: payload?.finalCharge || payload?.rideMetrics?.currentCharge || finalTotal,
        finalElapsedMinutes: payload?.finalElapsedMinutes || payload?.rideMetrics?.elapsedMinutes || liveElapsedMinutes,
      };
      saveCurrentRide(nextRideState);
      navigate('/taxi/user/rental/confirmed', {
        replace: true,
        state: nextRideState,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setEndingRide(false);
    }
  };

  if (activeRentalRide) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F3F4F6_38%,#EEF2F7_100%)] max-w-lg mx-auto font-sans pb-28 relative overflow-hidden">
        <div className="absolute -top-16 right-[-40px] h-44 w-44 rounded-full bg-emerald-100/60 blur-3xl pointer-events-none" />

        <div className="px-5 pt-14 space-y-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center text-center gap-3 py-5"
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.15)] ${isCompletedRentalRide ? 'bg-emerald-50' : 'bg-orange-50'}`}>
              <CheckCircle2 size={32} className={isCompletedRentalRide ? 'text-emerald-500' : 'text-orange-500'} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">
                {isCompletedRentalRide ? 'Ride Completed' : isEndRequestPending ? 'End Review Pending' : 'Rental In Progress'}
              </p>
              <h1 className="text-[22px] font-black text-slate-900 tracking-tight mt-0.5">
                {isCompletedRentalRide ? 'Final rental total' : isEndRequestPending ? 'Awaiting admin confirmation' : 'Vehicle assigned'}
              </h1>
              <p className="text-[12px] font-bold text-slate-400 mt-1">
                Booking ID: <span className="text-slate-700 font-black">{activeRentalRide.bookingReference || bookingId}</span>
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-[20px] border border-white/80 bg-white/90 shadow-[0_4px_14px_rgba(15,23,42,0.05)] overflow-hidden"
          >
            <div className="px-5 py-4 flex items-center gap-4 bg-[linear-gradient(135deg,#FFF7ED_0%,#FEF3C7_100%)]">
              {activeVehicleImage ? (
                <img src={activeVehicleImage} alt={activeVehicleName} className="h-16 w-20 object-contain drop-shadow-lg shrink-0" />
              ) : (
                <div className="h-16 w-20 rounded-2xl bg-white/70 shrink-0" />
              )}
              <div>
                <p className="text-[15px] font-black text-slate-900">{activeVehicleName}</p>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">{activeVehicleCategory}</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3 border-t border-slate-50">
              <div className="flex items-center justify-between rounded-[14px] bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Time Elapsed</p>
                  <p className="mt-1 text-[18px] font-black text-slate-900">{liveElapsedLabel}</p>
                </div>
                <Clock size={18} className="text-orange-500" />
              </div>
              {isSafetyOption ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[14px] bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold text-slate-400">Paid (rental + safety)</p>
                      <p className="mt-1 text-[16px] font-black text-emerald-600">Rs.{safetyHeld.toFixed(0)}</p>
                    </div>
                    <div className="rounded-[14px] bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold text-slate-400">{isCompletedRentalRide ? 'Final bill' : isEndRequestPending ? 'Frozen bill for review' : 'Bill till now'}</p>
                      <p className="mt-1 text-[16px] font-black text-slate-900">Rs.{finalTotal.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="rounded-[14px] border border-emerald-100 bg-emerald-50/60 px-4 py-3 space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                      {isCompletedRentalRide ? 'Safety money settlement' : 'Safety money (if you end now)'}
                    </p>
                    <div className="flex justify-between text-[12px] font-bold text-slate-600">
                      <span>Paid (rental + safety money)</span>
                      <span>Rs.{safetyHeld.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[12px] font-bold text-slate-600">
                      <span>Bill deducted</span>
                      <span>- Rs.{safetyDeducted.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-emerald-100 pt-1.5 text-[13px] font-black text-slate-900">
                      <span>{isCompletedRentalRide ? 'Refunded to your wallet' : 'Will be refunded'}</span>
                      <span className="text-emerald-600">Rs.{safetyRefund.toFixed(2)}</span>
                    </div>
                    {safetyDue > 0 ? (
                      <div className="flex justify-between text-[13px] font-black text-rose-600">
                        <span>You pay extra</span>
                        <span>Rs.{safetyDue.toFixed(2)}</span>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[14px] bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-bold text-slate-400">Advance paid</p>
                  <p className="mt-1 text-[16px] font-black text-emerald-600">Rs.{Number(activeRentalRide.advancePaid || activeRentalRide.payableNow || 0).toFixed(0)}</p>
                </div>
                <div className="rounded-[14px] bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-bold text-slate-400">{isCompletedRentalRide ? 'Final total' : isEndRequestPending ? 'Frozen total for review' : 'Charge till now'}</p>
                  <p className="mt-1 text-[16px] font-black text-slate-900">Rs.{finalTotal.toFixed(2)}</p>
                </div>
              </div>
              <div className="rounded-[14px] bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400">{isCompletedRentalRide ? 'Final payable balance' : isEndRequestPending ? 'Pending settlement after review' : 'Current remaining due'}</p>
                <p className="mt-1 text-[16px] font-black text-slate-900">
                  Rs.{Math.max(0, finalTotal - Number(activeRentalRide.advancePaid || activeRentalRide.payableNow || 0)).toFixed(2)}
                </p>
              </div>
                </>
              )}
              <div className="rounded-[14px] bg-slate-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pricing Plan</p>
                    <p className="mt-1 text-[14px] font-black text-slate-900">
                      {activePricingSummary.label} - Rs.{Number(activePricingSummary.basePrice || 0).toFixed(0)}
                      <span className="ml-1 text-[11px] font-bold text-slate-400">{activePricingSummary.suffix}</span>
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">
                      Includes {Number(activePricingSummary.includedHours || 0)} hr
                      {Number(activePricingSummary.includedHours || 0) === 1 ? '' : 's'}
                      {Number(activePricingSummary.extraHourRate || 0) > 0
                        ? `, then Rs.${Number(activePricingSummary.extraHourRate || 0).toFixed(0)}/extra hr`
                        : ' with no extra-hour charge'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400">Live billed</p>
                    <p className="mt-1 text-[16px] font-black text-slate-900">Rs.{liveCharge.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin size={13} className="text-orange-400 shrink-0" />
                <p className="text-[11px] font-black text-slate-700">
                  {activeRentalRide.serviceLocation?.name || `${appName} Hub`}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="flex items-start gap-3 rounded-[16px] border border-white/80 bg-white/90 px-4 py-3.5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
          >
            <div className="w-8 h-8 rounded-[10px] bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 size={15} className="text-emerald-500" strokeWidth={2} />
            </div>
            <p className="text-[12px] font-bold text-slate-500 leading-relaxed">
              {isCompletedRentalRide
                ? isSafetyOption
                  ? `Your rental ride has ended. Final bill is Rs.${finalTotal.toFixed(2)}: Rs.${safetyDeducted.toFixed(2)} was deducted from your safety money and Rs.${safetyRefund.toFixed(2)} is refunded to your wallet${safetyDue > 0 ? `. Please pay the remaining Rs.${safetyDue.toFixed(2)}.` : '.'}`
                  : `Your rental ride has ended. Final total is Rs.${finalTotal.toFixed(0)} and the remaining amount is payable at drop-off.`
                : isEndRequestPending
                  ? `Your end-ride request has been sent to admin for review. The current elapsed time and charge are now frozen until admin confirms the closure.`
                  : `Your rental is active now. The live charge keeps updating based on elapsed time until you end the ride.`}
            </p>
          </motion.div>
        </div>

        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 pb-6 pt-3 bg-gradient-to-t from-[#EEF2F7] via-[#F3F4F6]/95 to-transparent pointer-events-none z-30">
          {isCompletedRentalRide || isEndRequestPending ? (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/user')}
              className="pointer-events-auto w-full bg-slate-900 py-4 rounded-[18px] text-[15px] font-black text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)] flex items-center justify-center gap-2"
            >
              <Home size={16} strokeWidth={2.5} /> {isCompletedRentalRide ? 'Back to Home' : 'Track from Home'}
            </motion.button>
          ) : (
            <div className="pointer-events-auto w-full space-y-3">
              {HUB_SIMULATOR_ENABLED ? (
                <button
                  type="button"
                  onClick={() => setSimulatedAtHub((value) => !value)}
                  className={`w-full rounded-[14px] border border-dashed px-4 py-2.5 text-[11px] font-black ${
                    simulatedAtHub
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-sky-300 bg-sky-50 text-sky-700'
                  }`}
                >
                  {simulatedAtHub
                    ? 'TEST MODE: you are at the hub (tap to move away)'
                    : 'TEST MODE: tap to simulate reaching the hub'}
                </button>
              ) : null}
              {!isWithinHubRange && !locationError && (
                <div className="bg-orange-50 border border-orange-100 rounded-[14px] px-4 py-2 text-center">
                  <p className="text-[11px] font-black text-orange-600">
                    {distanceToHub !== null 
                      ? `Return to hub to end ride (${Math.round(distanceToHub)}m away)` 
                      : 'Calculating distance to hub...'}
                  </p>
                </div>
              )}
              {locationError && (
                <div className="bg-rose-50 border border-rose-100 rounded-[14px] px-4 py-2 text-center">
                  <p className="text-[11px] font-black text-rose-600">{locationError}</p>
                </div>
              )}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleEndRide}
                disabled={endingRide || !isWithinHubRange}
                className="w-full py-4 rounded-[18px] text-[15px] font-black flex items-center justify-center gap-2 transition-colors bg-[linear-gradient(135deg,#F97316_0%,#EA580C_100%)] text-white shadow-[0_10px_24px_rgba(234,88,12,0.32)] disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                <CheckCircle2 size={16} strokeWidth={2.5} /> {endingRide ? 'Sending end request...' : 'Request End Ride'}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F3F4F6_38%,#EEF2F7_100%)] max-w-lg mx-auto font-sans pb-28 relative overflow-hidden">
      <div className="absolute -top-16 right-[-40px] h-44 w-44 rounded-full bg-emerald-100/60 blur-3xl pointer-events-none" />

      <div className="px-5 pt-14 space-y-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center text-center gap-3 py-6"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.15)]">
            <CheckCircle2 size={32} className="text-emerald-500" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">
              Booking Confirmed
            </p>
            <h1 className="text-[22px] font-black text-slate-900 tracking-tight mt-0.5">
              You're all set!
            </h1>
            <p className="text-[12px] font-bold text-slate-400 mt-1">
              Booking ID: <span className="text-slate-700 font-black">{bookingId}</span>
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[20px] border border-white/80 bg-white/90 shadow-[0_4px_14px_rgba(15,23,42,0.05)] overflow-hidden"
        >
          <div
            className="px-5 py-4 flex items-center gap-4"
            style={{ background: `linear-gradient(135deg, ${vehicle.gradientFrom} 0%, ${vehicle.gradientTo} 100%)` }}
          >
            <img src={resolveAssetUrl(vehicle.image)} alt={vehicle.name} className="h-16 w-20 object-contain drop-shadow-lg shrink-0" />
            <div>
              <p className="text-[15px] font-black text-slate-900">{vehicle.name}</p>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                {selectedPackage?.label || duration}
              </p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-2.5 border-t border-slate-50">
            <div className="flex items-center gap-2.5">
              <Clock size={13} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-[11px] font-black text-slate-700">
                  Pickup: {pickup?.slice(0, 16).replace('T', ' ')}
                </p>
                <p className="text-[11px] font-bold text-slate-400">
                  Return: {returnTime?.slice(0, 16).replace('T', ' ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin size={13} className="text-orange-400 shrink-0" />
              <p className="text-[11px] font-black text-slate-700">
                {serviceLocation?.name || `${appName} Hub`}
              </p>
            </div>
            <div className="border-t border-slate-50 pt-2.5 flex justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400">{state.paymentOption === 'safety_money' ? 'Rental cost' : 'Rental cost (at pickup)'}</p>
                <p className="text-[15px] font-black text-slate-900">Rs.{totalCost}</p>
                <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                  {bookingPricingSummary.label} - Rs.{Number(bookingPricingSummary.basePrice || 0).toFixed(0)}
                  {bookingPricingSummary.suffix}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400">{state.paymentOption === 'safety_money' ? 'Paid (rental + safety money)' : 'Advance paid'}</p>
                <p className="text-[15px] font-black text-emerald-600">Rs.{deposit}</p>
                {paymentMethodLabel ? (
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">{paymentMethodLabel} via Razorpay</p>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-[20px] border border-white/80 bg-white/90 shadow-[0_4px_14px_rgba(15,23,42,0.05)] px-5 py-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[9px] bg-orange-50 flex items-center justify-center">
              <Camera size={13} className="text-orange-500" strokeWidth={2.5} />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Vehicle Condition Photo
            </p>
          </div>
          <p className="text-[12px] font-bold text-slate-400">
            You submitted this photo of the vehicle's condition with your booking. It protects you during return inspection.
          </p>
          {state.conditionPhoto?.imageUrl ? (
            <div className="relative rounded-[14px] overflow-hidden">
              <img src={resolveAssetUrl(state.conditionPhoto.imageUrl)} alt="Vehicle condition" className="w-full h-40 object-cover" />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-white" strokeWidth={2} />
              </div>
            </div>
          ) : null}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-start gap-3 rounded-[16px] border border-white/80 bg-white/90 px-4 py-3.5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
        >
          <div className="w-8 h-8 rounded-[10px] bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 size={15} className="text-emerald-500" strokeWidth={2} />
          </div>
          <p className="text-[12px] font-bold text-slate-500 leading-relaxed">
            {state.paymentOption === 'safety_money'
              ? `Your payment of Rs.${deposit} (rental + refundable safety money) has been received. At the end of the ride your final bill is deducted and the rest is refunded to your wallet.`
              : `Your booking advance of Rs.${deposit} has been received. The remaining rental cost is payable at pickup.`}
          </p>
        </motion.div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 pb-6 pt-3 bg-gradient-to-t from-[#EEF2F7] via-[#F3F4F6]/95 to-transparent pointer-events-none z-30">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/taxi/user')}
          className="pointer-events-auto w-full bg-slate-900 py-4 rounded-[18px] text-[15px] font-black text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)] flex items-center justify-center gap-2"
        >
          <Home size={16} strokeWidth={2.5} /> Go to Home Dashboard
        </motion.button>
      </div>
    </div>
  );
};

export default RentalConfirmed;
