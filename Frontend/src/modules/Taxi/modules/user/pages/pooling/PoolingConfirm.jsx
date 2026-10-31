import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, CircleCheckBig, CreditCard, Receipt, Split, Ticket, Users, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { userService } from '../../services/userService';
import { schedulePoolingBookingReminders } from '../../utils/upcomingRideReminderService';
import taxiImg from '../../../../assets/3d images/AutoCab/taxi.png';

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const unwrapPayload = (response) => response?.data?.data || response?.data || response || {};
const errorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const shortPlace = (label = '') => String(label).split(',')[0] || label;

const formatTime12h = (time = '') => {
  const [hh, mm] = String(time).split(':').map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return time;
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
};

const formatTravelDate = (value) => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PoolingConfirm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, trip, vehicle, pickup, drop, travelDate, departureTime, seats } = location.state || {};

  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [isBooking, setIsBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  // One id per confirm screen so a double tap on "pay with wallet" can never book twice.
  const requestIdRef = useRef(`${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);

  const requestBody = useMemo(
    () => ({
      tripId: mode === 'join' ? trip?._id : undefined,
      vehicleId: mode === 'create' ? vehicle?.vehicleId : undefined,
      pickup,
      drop,
      travelDate,
      departureTime,
      seats,
    }),
    [mode, trip?._id, vehicle?.vehicleId, pickup, drop, travelDate, departureTime, seats],
  );

  const hasState = Boolean(mode && pickup && drop && travelDate && departureTime && (trip || vehicle));

  useEffect(() => {
    if (!hasState) return undefined;
    let cancelled = false;

    const loadQuote = async () => {
      try {
        const response = await userService.quotePoolingBooking(requestBody);
        if (cancelled) return;
        const data = unwrapPayload(response);
        setQuote(data);
        setPaymentMethod(Number(data.walletBalance) >= Number(data.fare) && Number(data.fare) > 0 ? 'wallet' : 'razorpay');
      } catch (error) {
        if (cancelled) return;
        const message = errorMessage(error, 'This ride is no longer available.');
        setQuoteError(message);
        toast.error(message, { duration: 5000 });
      }
    };

    loadQuote();
    return () => {
      cancelled = true;
    };
  }, [hasState, requestBody]);

  useEffect(() => {
    if (!confirmedBooking) return;
    schedulePoolingBookingReminders({ ...confirmedBooking, departureTime, route: { originLabel: pickup?.label, destinationLabel: drop?.label } });
  }, [confirmedBooking, departureTime, pickup?.label, drop?.label]);

  if (!hasState) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white p-6 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <Ticket size={48} />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Session Expired</h2>
        <p className="mt-3 max-w-xs text-sm font-medium leading-relaxed text-slate-500">
          Your booking session has timed out. Please search for a ride again.
        </p>
        <button
          type="button"
          onClick={() => navigate('/taxi/user/pooling')}
          className="mt-10 flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-4 text-xs font-black uppercase tracking-widest text-white active:scale-95"
        >
          <ArrowLeft size={16} />
          Search again
        </button>
      </div>
    );
  }

  const onBookingDone = (response, message) => {
    setConfirmedBooking(unwrapPayload(response));
    toast.success(message);
  };

  const onBookingFailed = (error, fallback) => {
    toast.error(errorMessage(error, fallback), { duration: 6000 });
    setIsBooking(false);
  };

  const payWithWallet = async () => {
    try {
      const response = await userService.payPoolingBookingWithWallet({ ...requestBody, requestId: requestIdRef.current });
      onBookingDone(response, 'Pool ride booked');
    } catch (error) {
      onBookingFailed(error, 'Wallet payment failed');
    }
  };

  const payWithRazorpay = async () => {
    try {
      if (!(await loadRazorpayScript())) throw new Error('Razorpay SDK failed to load');

      const order = unwrapPayload(await userService.createPoolingBookingOrder(requestBody));
      if (!order.keyId || !order.orderId) throw new Error('Unable to start pooling payment');

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Pool Ride',
        description: `${shortPlace(pickup.label)} to ${shortPlace(drop.label)}`,
        order_id: order.orderId,
        modal: { ondismiss: () => setIsBooking(false) },
        theme: { color: '#0f172a' },
        handler: async (paymentResponse) => {
          try {
            const verified = await userService.verifyPoolingBookingPayment({ ...paymentResponse, ...requestBody });
            onBookingDone(verified, 'Pool ride booked');
          } catch (error) {
            onBookingFailed(error, 'Payment verification failed. If money was deducted it will be returned to your wallet.');
          }
        },
      });
      rzp.on('payment.failed', (event) => {
        toast.error(event?.error?.description || event?.error?.reason || 'Payment failed');
        setIsBooking(false);
      });
      rzp.open();
    } catch (error) {
      onBookingFailed(error, 'Unable to continue with payment');
    }
  };

  const handleConfirm = async () => {
    if (isBooking || !quote) return;
    setIsBooking(true);
    if (paymentMethod === 'wallet') await payWithWallet();
    else await payWithRazorpay();
  };

  const vehicleInfo = mode === 'join' ? trip.vehicle : vehicle;
  const vehicleImage = vehicleInfo?.images?.[0] || taxiImg;
  const walletCovers = quote ? Number(quote.walletBalance) >= Number(quote.fare) : false;
  const sharesAfter = quote ? quote.occupiedSeatsAfter : seats;

  if (confirmedBooking) {
    return (
      <div className="mx-auto min-h-screen max-w-lg bg-slate-50 px-5 pb-10 pt-8 font-sans">
        <div className="overflow-hidden rounded-[40px] border border-white bg-white shadow-[0_32px_64px_-12px_rgba(15,23,42,0.12)]">
          <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 px-6 pb-12 pt-10 text-white">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/20"
            >
              <CircleCheckBig size={40} />
            </motion.div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-100">Booking Successful</p>
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight">Your ride is<br />all set!</h1>
            <p className="mt-4 font-mono text-sm font-black text-emerald-50">ID {confirmedBooking.bookingId?.slice(-8)}</p>
          </div>

          <div className="space-y-5 px-6 pb-8 pt-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Departure</p>
                <p className="mt-3 text-sm font-black text-slate-900">{formatTravelDate(travelDate)}</p>
                <p className="mt-0.5 text-xs font-bold text-slate-500">{formatTime12h(departureTime)}</p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Your fare</p>
                <p className="mt-3 flex items-center gap-2 text-lg font-black text-slate-900"><Receipt size={16} className="text-emerald-600" />₹{confirmedBooking.fare}</p>
                {confirmedBooking.refundedAmount > 0 ? (
                  <p className="mt-0.5 text-[11px] font-bold text-emerald-600">₹{confirmedBooking.refundedAmount} returned to wallet</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-100 p-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pickup</p>
              <p className="mt-1 text-sm font-black text-slate-900">{confirmedBooking.pickupLabel || pickup.label}</p>
              <p className="mt-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Drop</p>
              <p className="mt-1 text-sm font-black text-slate-900">{confirmedBooking.dropLabel || drop.label}</p>
            </div>

            <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/50 p-5 text-xs font-semibold leading-relaxed text-emerald-800">
              When more people join this car, your fare drops and the difference is added to your wallet automatically.
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => navigate('/taxi/user/activity')}
                className="flex items-center justify-center gap-2 rounded-3xl border-2 border-slate-100 bg-white px-4 py-5 text-sm font-black text-slate-900 active:scale-[0.98]"
              >
                My Rides <ChevronRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/taxi/user')}
                className="rounded-3xl bg-slate-900 px-4 py-5 text-sm font-black text-white active:scale-[0.98]"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-slate-50 pb-36 font-sans selection:bg-indigo-100">
      <div className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 px-5 pb-5 pt-12 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-900 shadow-sm active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">Confirm Ride</h1>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              {mode === 'join' ? 'Joining a shared car' : 'Starting a new shared car'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-5 pt-8">
        <div className="overflow-hidden rounded-[36px] border border-white bg-white shadow-[0_32px_64px_-16px_rgba(15,23,42,0.1)]">
          <div className="flex items-center gap-5 bg-slate-900 px-6 py-6 text-white">
            <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <img src={vehicleImage} alt={vehicleInfo?.name} className="h-16 w-auto object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black">{vehicleInfo?.name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                <Users size={12} />{seats} seat{seats > 1 ? 's' : ''} · {formatTime12h(departureTime)} · {formatTravelDate(travelDate)}
              </p>
            </div>
          </div>
          <div className="space-y-5 p-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pickup</p>
              <p className="mt-1 text-sm font-black leading-tight text-slate-900">{pickup.label}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Drop</p>
              <p className="mt-1 text-sm font-black leading-tight text-slate-900">{drop.label}</p>
            </div>
          </div>
        </div>

        {quoteError ? (
          <div className="rounded-[28px] border border-rose-100 bg-rose-50 p-6 text-center">
            <p className="text-sm font-bold leading-relaxed text-rose-700">{quoteError}</p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-5 rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-white active:scale-95"
            >
              Back to rides
            </button>
          </div>
        ) : !quote ? (
          <div className="h-48 animate-pulse rounded-[36px] bg-white" />
        ) : (
          <>
            <div className="rounded-[36px] border border-slate-100 bg-white p-7 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Ticket size={18} /></div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Price Details</h3>
              </div>
              <div className="space-y-4 text-sm font-bold text-slate-500">
                <div className="flex justify-between"><span>Full car fare</span><span className="text-slate-900">₹{quote.totalCarFare}</span></div>
                <div className="flex justify-between"><span>Riders after you ({sharesAfter} of {quote.capacity} seats)</span><span className="text-slate-900">÷ {sharesAfter}</span></div>
                <div className="flex justify-between"><span>Your share ({seats} seat{seats > 1 ? 's' : ''})</span><span className="text-slate-900">₹{quote.baseFare}</span></div>
                {quote.serviceTaxAmount > 0 ? (
                  <div className="flex justify-between"><span>Service tax ({quote.serviceTaxPercentage}%)</span><span className="text-slate-900">₹{quote.serviceTaxAmount}</span></div>
                ) : null}
              </div>
              <div className="mt-6 flex items-end justify-between border-t border-slate-50 pt-6">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Amount Payable</p>
                <p className="text-4xl font-black tracking-tight text-slate-900">₹{quote.fare}</p>
              </div>
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold leading-relaxed text-emerald-700">
                <Split size={16} className="mt-0.5 shrink-0" />
                {mode === 'create'
                  ? `You pay the full car now. Each rider who joins lowers your share, and the difference comes back to your wallet. It can fall to ₹${Math.floor((quote.totalCarFare * 100) / quote.capacity) / 100}+tax per seat when the car is full.`
                  : 'Everyone already on this car pays less now that you joined. Their refunds happen automatically.'}
              </div>
            </div>

            <div className="space-y-3">
              <p className="px-2 text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Pay with</p>
              <button
                type="button"
                onClick={() => walletCovers && setPaymentMethod('wallet')}
                disabled={!walletCovers}
                className={`flex w-full items-center justify-between rounded-[28px] border-2 p-5 text-left transition ${
                  paymentMethod === 'wallet' ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-100 bg-white'
                } ${walletCovers ? '' : 'opacity-50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-900"><Wallet size={22} /></div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Wallet</p>
                    <p className="text-[11px] font-bold text-slate-500">
                      Balance ₹{quote.walletBalance}{walletCovers ? '' : ' · not enough'}
                    </p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('razorpay')}
                className={`flex w-full items-center justify-between rounded-[28px] border-2 p-5 text-left transition ${
                  paymentMethod === 'razorpay' ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-100 bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-900"><CreditCard size={22} /></div>
                  <div>
                    <p className="text-sm font-black text-slate-900">UPI / Card / NetBanking</p>
                    <p className="text-[11px] font-bold text-slate-500">Secured by Razorpay</p>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {quote && !quoteError ? (
        <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2">
          <div className="mx-5 mb-8 overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/90 p-2 shadow-[0_24px_50px_-12px_rgba(15,23,42,0.4)] backdrop-blur-xl">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isBooking}
              className="flex w-full items-center justify-center gap-3 rounded-[26px] bg-white py-5 text-sm font-black text-slate-900 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isBooking ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                  <span className="uppercase tracking-[0.2em]">Processing...</span>
                </>
              ) : (
                <>
                  <span className="uppercase tracking-[0.2em]">Confirm & Pay ₹{quote.fare}</span>
                  <div className="rounded-full bg-slate-900 p-1 text-white"><ChevronRight size={18} /></div>
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PoolingConfirm;
