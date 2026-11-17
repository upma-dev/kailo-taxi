import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Loader2, MapPin, Search, ShieldCheck, Timer, UserCheck, Wallet, Car, UserX, Banknote } from 'lucide-react';
import apiClient from '../../../shared/api/axiosInstance';

// Cancellation rules shown on the website. Every number comes from the admin's settings
// (Business Settings > Cancellation Policy and each vehicle's Set Price), through /common/cancellation-policy,
// so changing a value in admin changes this page and the fee riders are actually charged.

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const money = (sym, v) => `${sym}${Math.round(num(v) * 100) / 100}`;

const feeText = (p, sym) => {
  if (!p.enable_cancellation_charge) return 'No charge';
  const fixed = num(p.fixed_cancellation_charge);
  const pct = num(p.percentage_cancellation_charge);
  if (fixed > 0 && pct > 0) return `${money(sym, fixed)} + ${pct}% of fare`;
  if (fixed > 0) return money(sym, fixed);
  if (pct > 0) return `${pct}% of fare`;
  return 'No charge';
};

const maxText = (p, sym) => (feeText(p, sym) !== 'No charge' && num(p.max_cancellation_fee) > 0 ? money(sym, p.max_cancellation_fee) : '-');

// Two rules count as the same when every number a rider can see is the same.
const sig = (q) =>
  [q.enable_cancellation_charge, q.free_cancellation_time_mins, q.fixed_cancellation_charge, q.percentage_cancellation_charge, q.max_cancellation_fee, q.charge_after_driver_accepted, q.charge_after_driver_arrived, q.cancellation_grace_period_driver_arrived, q.fee_goes_to].join('|');

const minsText = (m) => `${num(m)} ${num(m) === 1 ? 'minute' : 'minutes'}`;

function Stat({ icon: Icon, label, value, note, tone = 'orange' }) {
  const tones = {
    orange: 'bg-[#E3F0EF] text-[#0F766E]',
    emerald: 'bg-[#EEFAB8] text-[#4D5F00]',
    sky: 'bg-[#E3F0EF] text-[#0F766E]',
    violet: 'bg-[#E3F0EF] text-[#0F766E]',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon size={20} />
      </span>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
      {note && <p className="mt-1 text-xs leading-relaxed text-slate-500">{note}</p>}
    </div>
  );
}

function Step({ icon: Icon, title, when, result, free }) {
  return (
    <li className="flex gap-4">
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${free ? 'bg-[#EEFAB8] text-[#4D5F00]' : 'bg-[#D7E8E7] text-[#0F766E]'}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1 border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-900">{title}</h4>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${free ? 'bg-[#EEFAB8] text-[#4D5F00]' : 'bg-[#E3F0EF] text-[#0F766E]'}`}>{result}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{when}</p>
      </div>
    </li>
  );
}


// Share of the rider's cancellation fee that is paid to the driver (same rule the server uses when a ride is cancelled).
const driverShare = (q) => {
  const comp = num(q.driver_compensation_percentage);
  return Math.min(100, Math.max(0, q.fee_goes_to === 'driver' && !(comp > 0) ? 100 : comp));
};

const shareText = (q) => {
  const share = driverShare(q);
  if (!q.enable_cancellation_charge || feeText(q, '') === 'No charge') return 'No fee to share';
  return share > 0 ? `${share}% of the fee` : 'None';
};

const driverSig = (q) => [q.enable_cancellation_charge, q.driver_cancellation_penalty, q.cancellation_grace_period_driver_arrived, driverShare(q), feeText(q, '')].join('|');

function DriverView({ base, vehicles, sym }) {
  // Same idea as the rider view: follow the vehicles when they agree, otherwise point to the table.
  const uniform = vehicles.length > 0 && vehicles.every((x) => driverSig(x.policy) === driverSig(vehicles[0].policy));
  const varies = vehicles.length > 0 && !uniform;
  const p = uniform ? vehicles[0].policy : base;
  const penalty = num(p.driver_cancellation_penalty);
  const wait = num(p.cancellation_grace_period_driver_arrived);
  const share = driverShare(p);
  const feeOn = p.enable_cancellation_charge && feeText(p, sym) !== 'No charge';
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 text-lg font-black text-slate-900 sm:text-xl">Driver cancellation at a glance</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={Banknote} tone="orange" label="Charge for cancelling a ride" value={varies ? 'Varies by vehicle' : penalty > 0 ? money(sym, penalty) : 'No charge'} note={varies ? 'see the table below for each vehicle' : penalty > 0 ? 'taken from your wallet when you cancel an accepted ride' : undefined} />
          <Stat icon={Timer} tone="violet" label="Waiting time at pickup" value={minsText(wait)} note="wait this long after you arrive before you can report a no-show" />
          <Stat icon={Wallet} tone="emerald" label="Your share of the rider fee" value={varies ? 'Varies by vehicle' : feeOn ? (share > 0 ? `${share}%` : 'None') : 'No fee to share'} note={varies ? undefined : feeOn && share > 0 ? 'paid to your wallet when a rider cancels late or does not show up' : undefined} />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-black text-slate-900 sm:text-xl">What happens, step by step</h2>
        <p className="mb-5 text-sm text-slate-500">Know what to expect before you cancel a ride.</p>
        <ul className="space-y-4">
          <Step
            icon={UserX}
            free
            title="The rider does not show up"
            when={`Wait at the pickup point for ${minsText(wait)} after you arrive, then cancel and choose "rider no-show". You are not charged.${feeOn ? ' The rider pays the cancellation fee.' : ''}`}
            result="No charge to you"
          />
          <Step
            icon={AlertCircle}
            title="You cancel for any other reason"
            when="Cancelling an accepted ride for another reason, such as a change of plan, counts as a driver cancellation."
            result={varies ? 'See table' : penalty > 0 ? `${money(sym, penalty)} charge` : 'No charge'}
            free={!varies && penalty <= 0}
          />
          <Step
            icon={UserCheck}
            free
            title="The rider cancels late"
            when={feeOn ? 'If the rider cancels after the free window, the rider pays a fee. You receive your share of it.' : 'There is currently no rider cancellation fee, so there is nothing to share.'}
            result={varies ? 'See table' : feeOn ? (share > 0 ? `You get ${share}%` : 'No share') : 'No fee'}
          />
        </ul>
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
          Cancelling often can affect your rating and the ride requests you receive. Accept only the rides you can complete.
        </p>
      </section>

      {vehicles.length > 0 && (
        <section>
          <h2 className="mb-1 text-lg font-black text-slate-900 sm:text-xl">Charges by vehicle</h2>
          <p className="mb-5 text-sm text-slate-500">The numbers can differ for each vehicle type.</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Charge for cancelling</th>
                  <th className="px-4 py-3">Wait before no-show</th>
                  <th className="px-4 py-3">Your share of rider fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {vehicles.map((x) => (
                  <tr key={x.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-bold text-slate-900">{x.name}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{num(x.policy.driver_cancellation_penalty) > 0 ? money(sym, x.policy.driver_cancellation_penalty) : 'No charge'}</td>
                    <td className="px-4 py-3">{minsText(x.policy.cancellation_grace_period_driver_arrived)}</td>
                    <td className="px-4 py-3">{shareText(x.policy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default function CancellationPolicyView({ audience = 'user' }) {
  const [state, setState] = useState({ loading: true, data: null, error: false });

  useEffect(() => {
    let alive = true;
    apiClient
      .get('/common/cancellation-policy')
      .then((res) => {
        const data = res?.data?.data || res?.data || null;
        if (alive) setState({ loading: false, data: data?.default_policy ? data : null, error: !data?.default_policy });
      })
      .catch(() => alive && setState({ loading: false, data: null, error: true }));
    return () => {
      alive = false;
    };
  }, []);

  const { loading, data, error } = state;
  const sym = data?.currency_symbol || '₹';
  const vehicles = useMemo(() => (Array.isArray(data?.vehicles) ? data.vehicles : []), [data]);
  // A ride is charged by its vehicle's own rule, so the summary follows the vehicles when they all agree.
  // When they differ, the summary says so and the table below gives each vehicle's numbers.
  const uniform = vehicles.length > 0 && vehicles.every((v) => sig(v.policy) === sig(vehicles[0].policy));
  const varies = vehicles.length > 0 && !uniform;
  const p = uniform ? vehicles[0].policy : data?.default_policy;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
        <Loader2 size={30} className="animate-spin text-[color:var(--app-primary,#F38F24)]" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading cancellation policy...</p>
      </div>
    );
  }

  if (error || !p) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <p>The cancellation charges could not be loaded right now. Please check again in a moment, or see the fee on your booking screen before you cancel.</p>
      </div>
    );
  }

  if (audience === 'driver') return <DriverView base={data.default_policy} vehicles={vehicles} sym={sym} />;

  const on = varies ? vehicles.some((v) => v.policy.enable_cancellation_charge) : p.enable_cancellation_charge;
  const sameFree = vehicles.every((v) => num(v.policy.free_cancellation_time_mins) === num(vehicles[0].policy.free_cancellation_time_mins));
  const freeMins = varies && !sameFree ? Math.min(...vehicles.map((v) => num(v.policy.free_cancellation_time_mins))) : num(p.free_cancellation_time_mins);
  const fee = varies ? 'Varies by vehicle' : feeText(p, sym);
  const cap = varies || fee === 'No charge' ? 0 : num(p.max_cancellation_fee);
  const chargeAccepted = varies ? vehicles.some((v) => v.policy.charge_after_driver_accepted) : p.charge_after_driver_accepted;
  const chargeArrived = varies ? vehicles.some((v) => v.policy.charge_after_driver_arrived) : p.charge_after_driver_arrived;

  return (
    <div className="space-y-10">
      {!on && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#C6F432]/60 bg-[#F6FCD6] p-4 text-sm font-semibold text-[#4D5F00]">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p>Cancelling a ride is free right now. No cancellation charge is applied at any stage.</p>
        </div>
      )}

      {/* Key numbers */}
      <section>
        <h2 className="mb-4 text-lg font-black text-slate-900 sm:text-xl">Cancellation at a glance</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Timer} tone="emerald" label="Free cancellation" value={on ? `${varies && !sameFree ? 'From ' : ''}${minsText(freeMins)}` : 'Always'} note={on ? 'after booking, and any time while we are still finding a driver' : 'no charge at any stage'} />
          <Stat icon={Wallet} tone="orange" label="Cancellation fee" value={fee} note={varies ? 'see the table below for each vehicle' : on ? 'charged after the free window, once a driver is on the way' : undefined} />
          <Stat icon={ShieldCheck} tone="sky" label="Maximum fee" value={varies ? 'Varies' : on && cap > 0 ? money(sym, cap) : '-'} note={varies ? 'every vehicle has its own limit' : on && cap > 0 ? 'you never pay more than this for one cancellation' : undefined} />
          <Stat icon={Clock} tone="violet" label="Driver waiting time" value={minsText(p.cancellation_grace_period_driver_arrived)} note="a driver waits this long at pickup before a no-show can be reported" />
        </div>
      </section>

      {/* Stage by stage */}
      <section>
        <h2 className="mb-1 text-lg font-black text-slate-900 sm:text-xl">What you pay, step by step</h2>
        <p className="mb-5 text-sm text-slate-500">The charge depends on how far your ride has progressed when you cancel.</p>
        <ul className="space-y-4">
          <Step icon={Search} free title="While we find a driver" when="Cancel anytime before a driver accepts your ride." result="Free" />
          {on && freeMins > 0 && <Step icon={Timer} free title={`Within ${minsText(freeMins)} of booking`} when="Changed your mind quickly? Cancel inside the free window at no cost." result="Free" />}
          <Step
            icon={UserCheck}
            free={!on || !chargeAccepted}
            title="After a driver accepts"
            when={on && chargeAccepted ? `The driver is on the way to you. Once the free ${minsText(freeMins)} are over, a fee applies.` : 'The driver is on the way to you. No fee for cancelling at this stage.'}
            result={on && chargeAccepted ? fee : 'Free'}
          />
          <Step
            icon={MapPin}
            free={!on || !chargeArrived}
            title="After the driver arrives"
            when={on && chargeArrived ? 'The driver is waiting at your pickup point, so the cancellation fee applies.' : 'The driver is at your pickup point. No fee for cancelling at this stage.'}
            result={on && chargeArrived ? fee : 'Free'}
          />
          <Step icon={Car} free={!on} title="After the ride starts" when="Once you are in the vehicle and the trip has begun." result={on ? fee : 'Free'} />
        </ul>
        {on && (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
            The cancellation fee is shown in the app before you confirm the cancellation. It is added to your next ride fare{cap > 0 ? ` and is never more than ${money(sym, cap)}` : ''}.
            {!varies && p.fee_goes_to === 'driver' ? ' The fee is paid to the driver for the time and fuel spent coming to you.' : ''}
          </p>
        )}
      </section>

      {/* Per vehicle */}
      {vehicles.length > 0 && (
        <section>
          <h2 className="mb-1 text-lg font-black text-slate-900 sm:text-xl">Charges by vehicle</h2>
          <p className="mb-5 text-sm text-slate-500">The fee can differ for each vehicle type.</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Free window</th>
                  <th className="px-4 py-3">Cancellation fee</th>
                  <th className="px-4 py-3">Maximum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-bold text-slate-900">{v.name}</td>
                    <td className="px-4 py-3">{v.policy.enable_cancellation_charge ? minsText(v.policy.free_cancellation_time_mins) : 'Always free'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{feeText(v.policy, sym)}</td>
                    <td className="px-4 py-3">{maxText(v.policy, sym)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Driver side */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black text-slate-900 sm:text-xl">If the driver cancels or you are not at pickup</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
          <li>If your driver cancels the ride, you are not charged anything.</li>
          {on && (
            <li>
              If the driver waits at pickup for {minsText(p.cancellation_grace_period_driver_arrived)} and you do not show up, the driver can cancel as a no-show and the cancellation fee applies{varies ? '' : ` (${fee})`}.
            </li>
          )}
          <li>Repeated cancellations can temporarily limit your bookings.</li>
        </ul>
      </section>
    </div>
  );
}
