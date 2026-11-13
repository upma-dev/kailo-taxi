import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, CalendarClock, Loader2, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { buyDriverSubscription, getDriverSubscriptions } from '../../services/registrationService';

const unwrap = (response) => {
  const body = response?.data ?? response;
  return body?.data && body.mode === undefined ? body.data : body;
};

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const MODE_TEXT = {
  subscriptionOnly: 'You need an active plan to go online and get rides. While your plan runs, no commission is taken from your rides.',
  both: 'A plan is optional. While your plan runs, no commission is taken from your rides. Without a plan, the normal commission applies.',
  commissionOnly: 'Subscriptions are not available right now. The normal commission applies to every ride.',
};

const DriverSubscription = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routePrefix = location.pathname.startsWith('/taxi/owner') ? '/taxi/owner' : '/taxi/driver';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState('');
  const [confirmPlan, setConfirmPlan] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(unwrap(await getDriverSubscriptions()));
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buy = async (plan) => {
    setConfirmPlan(null);
    setBuyingId(plan.id);
    try {
      const result = unwrap(await buyDriverSubscription(plan.id));
      const sub = result?.subscription;
      toast.success(
        sub?.status === 'upcoming'
          ? `${plan.name} bought. It starts on ${formatDate(sub.startsAt)} when your current plan ends.`
          : `${plan.name} is active now.`,
      );
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not buy this plan');
    } finally {
      setBuyingId('');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="animate-spin text-slate-900" size={24} />
      </div>
    );
  }

  const mode = data?.mode || 'commissionOnly';
  const active = data?.active;

  return (
    <div className="min-h-screen bg-slate-50 pb-16 font-sans">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-100 bg-white px-5 pb-4 pt-10">
        <button
          type="button"
          onClick={() => navigate(`${routePrefix}/profile`)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Subscription</h1>
          <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">Driver plans</p>
        </div>
      </header>

      <main className="space-y-5 px-5 pt-5">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="text-[13px] font-medium leading-relaxed text-slate-600">{MODE_TEXT[mode]}</p>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <span className="flex items-center gap-2 text-[12px] font-semibold text-slate-500"><Wallet size={15} /> Wallet balance</span>
            <span className="text-[15px] font-bold text-slate-900">{formatCurrency(data?.walletBalance)}</span>
          </div>
        </div>

        {active ? (
          <div className="rounded-3xl bg-emerald-600 p-5 text-white shadow-lg">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-100"><BadgeCheck size={15} /> Active plan</p>
            <p className="mt-2 text-xl font-bold">{active.name}</p>
            <p className="mt-1 text-[13px] text-emerald-50">
              Valid till {formatDate(active.expiresAt)} · {active.daysLeft} day{active.daysLeft === 1 ? '' : 's'} left
            </p>
          </div>
        ) : mode === 'subscriptionOnly' ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-[14px] font-bold text-amber-800">No active plan</p>
            <p className="mt-1 text-[12px] text-amber-700">Buy a plan below to go online.</p>
          </div>
        ) : null}

        {(data?.upcoming || []).map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
            <CalendarClock size={18} className="text-indigo-500" />
            <p className="text-[12px] font-semibold text-slate-600">
              {item.name} starts on {formatDate(item.startsAt)} (after your current plan).
            </p>
          </div>
        ))}

        {mode !== 'commissionOnly' ? (
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">Plans</h2>
            {(data?.plans || []).length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-[12px] text-slate-400">
                No plan is available for your vehicle right now.
              </div>
            ) : (
              data.plans.map((plan) => (
                <div key={plan.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[16px] font-bold text-slate-900">{plan.name}</p>
                      <p className="text-[12px] text-slate-500">
                        {plan.duration} day{plan.duration === 1 ? '' : 's'}
                        {plan.vehicle_type ? ` · ${plan.vehicle_type.name}` : ''}
                      </p>
                    </div>
                    <p className="text-[18px] font-bold text-slate-900">{formatCurrency(plan.amount)}</p>
                  </div>
                  {plan.description ? <p className="mt-2 text-[12px] text-slate-500">{plan.description}</p> : null}
                  <button
                    type="button"
                    disabled={Boolean(buyingId)}
                    onClick={() => setConfirmPlan(plan)}
                    className="mt-4 h-11 w-full rounded-2xl bg-slate-900 text-[13px] font-bold text-white disabled:opacity-60"
                  >
                    {buyingId === plan.id ? 'Buying...' : active ? 'Buy next plan' : 'Buy plan'}
                  </button>
                </div>
              ))
            )}
          </section>
        ) : null}

        {(data?.history || []).length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">History</h2>
            <ul className="divide-y divide-slate-100 rounded-3xl bg-white ring-1 ring-slate-100">
              {data.history.map((item) => (
                <li key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">{item.name}</p>
                    <p className="text-[11px] text-slate-400">{formatDate(item.startsAt)} to {formatDate(item.expiresAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-bold text-slate-900">{formatCurrency(item.amount)}</p>
                    <p className={`text-[10px] font-bold uppercase ${item.status === 'active' ? 'text-emerald-600' : item.status === 'upcoming' ? 'text-indigo-500' : 'text-slate-400'}`}>
                      {item.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      {confirmPlan ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45" onClick={() => setConfirmPlan(null)}>
          <div className="w-full max-w-md rounded-t-[28px] bg-white px-6 pb-8 pt-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[17px] font-bold text-slate-900">Buy {confirmPlan.name}?</h3>
            <p className="mt-2 text-[13px] text-slate-600">
              {formatCurrency(confirmPlan.amount)} will be taken from your wallet for {confirmPlan.duration} day{confirmPlan.duration === 1 ? '' : 's'}.
              {active ? ' It starts when your current plan ends.' : ' It starts right away.'}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirmPlan(null)} className="h-12 rounded-2xl border border-slate-200 text-[13px] font-bold text-slate-600">
                Cancel
              </button>
              <button type="button" onClick={() => buy(confirmPlan)} className="h-12 rounded-2xl bg-slate-900 text-[13px] font-bold text-white">
                Pay {formatCurrency(confirmPlan.amount)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DriverSubscription;
