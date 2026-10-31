import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ArrowLeft, Calendar, Clock, Minus, Plus, Search, Users, Wallet, Split } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import PoolingPlaceInput from './PoolingPlaceInput';
import taxiImg from '../../../../assets/3d images/AutoCab/taxi.png';

const MAX_SEATS = 4;

const pad = (value) => String(value).padStart(2, '0');
const toDateInput = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Default departure: next half hour that is at least 30 minutes away.
const getDefaultDeparture = () => {
  const next = new Date(Date.now() + 30 * 60 * 1000);
  next.setMinutes(next.getMinutes() <= 30 ? 30 : 60, 0, 0);
  return { date: toDateInput(next), time: `${pad(next.getHours())}:${pad(next.getMinutes())}` };
};

const HOW_IT_WORKS = [
  { icon: Users, title: 'Book the car', text: 'Pay for the whole car. Others heading your way can hop in.' },
  { icon: Split, title: 'Fare gets split', text: 'Every rider who joins brings everyone\'s share down.' },
  { icon: Wallet, title: 'Money back instantly', text: 'The difference lands in your wallet right away.' },
];

const PoolingHome = () => {
  const navigate = useNavigate();
  const [defaults] = useState(getDefaultDeparture);
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState(defaults.time);
  const [seats, setSeats] = useState(1);

  const swapLocations = () => {
    if (!pickup || !drop) {
      toast.error('Select both pickup and drop first');
      return;
    }
    setPickup(drop);
    setDrop(pickup);
  };

  const handleSearch = () => {
    if (!pickup) return toast.error('Please choose a pickup location from the suggestions');
    if (!drop) return toast.error('Please choose a drop location from the suggestions');
    if (!date || !time) return toast.error('Please choose date and time');

    const departure = new Date(`${date}T${time}:00`);
    if (Number.isNaN(departure.getTime()) || departure.getTime() < Date.now() + 15 * 60 * 1000) {
      return toast.error('Please choose a departure at least 15 minutes from now');
    }

    const params = new URLSearchParams({
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      pickupLabel: pickup.label,
      dropLat: drop.lat,
      dropLng: drop.lng,
      dropLabel: drop.label,
      date,
      time,
      seats,
    });
    navigate(`/taxi/user/pooling/list?${params.toString()}`);
    return undefined;
  };

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-white pb-24 font-sans selection:bg-indigo-100">
      <div className="relative overflow-hidden bg-slate-900 px-6 pb-28 pt-12 text-white">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative z-20 mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/taxi/user')}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md transition hover:bg-white/20"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md">
            <Users size={18} className="text-indigo-200" />
          </div>
        </div>

        <div className="relative z-10 flex items-end justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="max-w-[200px]">
            <h1 className="text-5xl font-black leading-[0.9] tracking-tight">
              POOL <br />
              <span className="text-indigo-400">RIDE.</span>
            </h1>
            <p className="mt-4 inline-block rounded-full bg-white/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.3em] text-indigo-100 backdrop-blur-sm">
              Share the car, split the fare
            </p>
          </motion.div>
          <motion.img
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            src={taxiImg}
            alt="Pooling"
            className="relative z-10 -mr-10 h-40 w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          />
        </div>
      </div>

      <div className="relative z-50 mx-6 -mt-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[40px] border border-slate-50 bg-white p-6 shadow-2xl shadow-indigo-200/50"
        >
          <div className="space-y-4">
            <PoolingPlaceInput value={pickup} onChange={setPickup} placeholder="Pickup location" allowCurrentLocation />

            <div className="relative z-10 -my-3 flex justify-center">
              <button
                type="button"
                onClick={swapLocations}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-white bg-indigo-600 text-white shadow-xl transition-transform active:scale-90"
              >
                <ArrowLeftRight size={20} className="rotate-90" />
              </button>
            </div>

            <PoolingPlaceInput value={drop} onChange={setDrop} placeholder="Drop location" accentClass="text-rose-500" />

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                <input
                  type="date"
                  value={date}
                  min={toDateInput(new Date())}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full appearance-none rounded-[24px] border border-transparent bg-slate-50 py-5 pl-11 pr-3 text-sm font-black text-slate-900 outline-none focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50"
                />
              </div>
              <div className="relative">
                <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="w-full appearance-none rounded-[24px] border border-transparent bg-slate-50 py-5 pl-11 pr-3 text-sm font-black text-slate-900 outline-none focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[24px] bg-slate-50 px-5 py-3">
              <div className="flex items-center gap-3">
                <Users size={18} className="text-indigo-500" />
                <span className="text-sm font-black text-slate-900">Seats</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  disabled={seats <= 1}
                  onClick={() => setSeats((current) => Math.max(1, current - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm active:scale-90 disabled:opacity-30"
                >
                  <Minus size={16} />
                </button>
                <span className="w-4 text-center text-base font-black text-slate-900">{seats}</span>
                <button
                  type="button"
                  disabled={seats >= MAX_SEATS}
                  onClick={() => setSeats((current) => Math.min(MAX_SEATS, current + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm active:scale-90 disabled:opacity-30"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSearch}
              className="mt-2 flex w-full items-center justify-center gap-3 rounded-[24px] bg-slate-900 py-5 text-sm font-black text-white shadow-2xl shadow-slate-200 transition hover:bg-black active:scale-[0.98]"
            >
              <Search size={20} />
              Find Rides
            </button>
          </div>
        </motion.div>
      </div>

      <div className="mt-14 px-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">How pooling works</h2>
        <div className="mt-6 space-y-4">
          {HOW_IT_WORKS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-4 rounded-[28px] border border-slate-100 bg-white p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Icon size={22} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">{title}</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PoolingHome;
