import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Flame,
  Gift,
  Loader2,
  Star,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DriverBottomNav from '../../shared/components/DriverBottomNav';
import { claimDriverIncentiveReward, getDriverIncentives } from '../services/registrationService';

const unwrap = (response) => response?.data?.data || response?.data || response || {};

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const progressPercent = (current, target) => {
  const safeTarget = Math.max(1, Number(target || 0));
  const safeCurrent = Math.max(0, Number(current || 0));
  return Math.min(100, Math.round((safeCurrent / safeTarget) * 100));
};

const LEVEL_COLORS = {
  Bronze: '#B45309',
  Silver: '#64748B',
  Gold: '#D97706',
  Platinum: '#4F46E5',
};

const FEATURE_ICONS = {
  daily_active_streak: Flame,
  weekly_trip_quest: Zap,
  peak_hour_booster: Clock3,
  weekend_warrior: CalendarCheck,
  rating_guard: Star,
  cancellation_guard: CheckCircle2,
};

const periodLabel = (period) => (period === 'month' ? 'This month' : 'This week');

// What the driver sees for the current value of a booster ("4.6 rating", "2% cancel rate", "3/7 days").
const featureProgressText = (feature) => {
  const unit = feature.unit ? ` ${feature.unit}` : '';
  if (feature.key === 'rating_guard') return `${Number(feature.currentValue || 0).toFixed(1)} now · need ${feature.targetValue}+`;
  if (feature.lowerIsBetter) return `${feature.currentValue}% now · keep at or below ${feature.targetValue}%`;
  return `${feature.currentValue}/${feature.targetValue}${unit}`;
};

const referralText = (referral) => {
  const amount = formatCurrency(referral.amount);
  const conditional = String(referral.type || '').startsWith('conditional');
  const both = String(referral.type || '').endsWith('_new');
  const when = conditional && referral.rideCount > 0
    ? `after the driver you invite completes ${referral.rideCount} ride${referral.rideCount === 1 ? '' : 's'}`
    : 'when a new driver joins with your referral code';
  return `Earn ${amount} ${when}.${both ? ` They get ${amount} too.` : ''}`;
};

const ClaimButton = ({ item, claimKey, claimingKey, onClaim, idleLabel = 'In progress' }) => {
  const busy = claimingKey === claimKey;
  if (item.isClaimed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-xl bg-green-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-green-600">
        <CheckCircle2 size={12} /> Claimed
      </span>
    );
  }
  if (item.isEligible) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onClaim}
        className="rounded-xl bg-black px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-60"
      >
        {busy ? 'Claiming...' : 'Claim'}
      </button>
    );
  }
  return <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">{idleLabel}</span>;
};

const EmptyCard = ({ text }) => (
  <div className="rounded-3xl border border-dashed border-gray-200 px-5 py-6 text-center text-xs font-medium text-gray-400">
    {text}
  </div>
);

const DriverIncentives = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimingKey, setClaimingKey] = useState('');
  const [statInfo, setStatInfo] = useState(null);

  const fetchIncentives = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError('');

    try {
      setData(unwrap(await getDriverIncentives()));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Unable to load incentives');
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncentives();
  }, []);

  const handleClaim = async (rewardType, rewardKey) => {
    setClaimingKey(`${rewardType}:${rewardKey}`);
    try {
      const response = await claimDriverIncentiveReward({ rewardType, rewardKey });
      const claimedReward = unwrap(response)?.claimedReward;
      toast.success(`${formatCurrency(claimedReward?.amount || 0)} added to your wallet!`);
      await fetchIncentives({ quiet: true });
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || requestError?.message || 'Unable to claim reward');
    } finally {
      setClaimingKey('');
    }
  };

  const summary = useMemo(() => data?.summary || {}, [data]);
  const level = useMemo(() => data?.level || null, [data]);
  const referral = useMemo(() => data?.referral || {}, [data]);
  const milestones = useMemo(() => data?.milestones || [], [data]);
  const features = useMemo(() => data?.features || [], [data]);
  const bonusEarnings = useMemo(
    () => (data?.claimedRewards || []).reduce((sum, item) => sum + Number(item?.amount || 0), 0),
    [data],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-black" size={24} />
        <p className="mt-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Loading Rewards</p>
      </div>
    );
  }

  const levelColor = LEVEL_COLORS[level?.name] || LEVEL_COLORS.Bronze;
  const levelSpan = level?.nextMinTrips != null ? level.nextMinTrips - level.currentMinTrips : 1;
  const levelDone = level?.nextMinTrips != null ? level.totalTrips - level.currentMinTrips : 1;
  const nothingOffered = milestones.length === 0 && features.length === 0;
  const activeDayMinutes = Number(summary.activeDayMinutes || 60);
  const activeDayText = activeDayMinutes % 60 === 0
    ? `${activeDayMinutes / 60} hour${activeDayMinutes === 60 ? '' : 's'}`
    : `${activeDayMinutes} minutes`;
  const streakBooster = features.find((item) => item.key === 'daily_active_streak');
  const STAT_INFO = {
    streak: {
      title: 'Streak',
      text: `The number of days in a row you stayed online for at least ${activeDayText}. Today counts once you reach ${activeDayText} online. Miss one day and it starts again from 0.`,
      extra: streakBooster
        ? `Streak bonus: reach ${streakBooster.targetValue} days to earn ${formatCurrency(streakBooster.reward_amount)}.`
        : 'No streak bonus is running right now, so this is only for your information.',
    },
    week: {
      title: 'This week',
      text: 'Trips you completed this week, from Monday 12:00 AM to Sunday night. It starts again from 0 every Monday.',
      extra: 'Weekly quests and the weekly trip booster use this number.',
    },
    rating: {
      title: 'Rating',
      text: 'Your average rating from riders after their trips (out of 5). Good service, being on time and a clean vehicle raise it.',
      extra: 'The rating bonus (when running) needs a high rating and at least 10 trips in the month.',
    },
  };

  return (
    <div className="min-h-screen bg-white font-sans pb-32">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-6 pt-10 pb-6 border-b border-gray-100">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/taxi/driver/profile')}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm"
              aria-label="Back to account"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Incentives</h1>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Driver Earnings</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bonus earned</p>
            <p className="text-lg font-bold text-black">{formatCurrency(bonusEarnings)}</p>
          </div>
        </div>
      </header>

      <main className="px-6 pt-6 space-y-8">
        {error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
            {error}{' '}
            <button type="button" onClick={() => fetchIncentives()} className="underline">Retry</button>
          </div>
        ) : null}

        {/* Level: a badge from lifetime completed trips */}
        {level ? (
          <section className="bg-gray-50 rounded-3xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                <Trophy size={24} style={{ color: levelColor }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{level.name} Captain</h2>
                <p className="text-sm font-medium text-gray-500">
                  Level {level.level} · {level.totalTrips} completed trip{level.totalTrips === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-400">{level.nextName ? `Next: ${level.nextName}` : 'Top level reached'}</span>
                <span className="text-gray-900">
                  {level.nextName ? `${level.tripsToNext} more trip${level.tripsToNext === 1 ? '' : 's'}` : '🎉'}
                </span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercent(levelDone, levelSpan)}%`, backgroundColor: levelColor }}
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-gray-200/50">
              <button type="button" onClick={() => setStatInfo(STAT_INFO.streak)} className="text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Streak</p>
                <p className="text-base font-bold text-gray-900 flex items-center gap-1">
                  {summary.streakDays || 0} <Flame size={14} className="text-orange-500" />
                </p>
                <p className="text-[9px] font-medium text-gray-400">days online {activeDayText}+ ⓘ</p>
              </button>
              <button type="button" onClick={() => setStatInfo(STAT_INFO.week)} className="text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">This week</p>
                <p className="text-base font-bold text-gray-900">{summary.currentWeekTrips || 0} {Number(summary.currentWeekTrips || 0) === 1 ? 'trip' : 'trips'}</p>
                <p className="text-[9px] font-medium text-gray-400">Mon to Sun ⓘ</p>
              </button>
              <button type="button" onClick={() => setStatInfo(STAT_INFO.rating)} className="text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Rating</p>
                <p className="text-base font-bold text-gray-900 flex items-center gap-1">
                  {Number(summary.rating || 0).toFixed(1)} <Star size={14} className="text-yellow-500 fill-yellow-500" />
                </p>
                <p className="text-[9px] font-medium text-gray-400">from riders ⓘ</p>
              </button>
            </div>
          </section>
        ) : null}

        {nothingOffered ? (
          <EmptyCard text="No incentive programs are running right now. When the admin starts one, it will show here with your live progress." />
        ) : null}

        {/* Milestone programs (multi-week challenges) */}
        {milestones.length > 0 ? (
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Active Quests</h3>
            <div className="space-y-3">
              {milestones.map((milestone) => {
                const claimKey = `milestone:${milestone.id}`;
                const p = milestone.progress || {};
                return (
                  <div key={milestone.id} className="border border-gray-100 rounded-3xl p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="space-y-1 pr-3">
                        <h4 className="font-bold text-gray-900">{milestone.name}</h4>
                        <p className="text-xs text-gray-500">
                          For {p.targetWeeks} week{p.targetWeeks === 1 ? '' : 's'}: at least {p.minTripsPerWeek} trips every week
                          {p.activeHoursPerDay > 0 ? ` and ${p.activeHoursPerDay}h online every day` : ''}.
                        </p>
                        {milestone.notes ? <p className="text-[11px] text-gray-400">{milestone.notes}</p> : null}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reward</p>
                        <p className="text-sm font-bold text-green-600">{formatCurrency(milestone.payout_amount)}</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-gray-400">
                          <span>Weeks with {p.minTripsPerWeek}+ trips (this week: {p.currentWeekTrips || 0})</span>
                          <span>{p.qualifyingWeeks || 0}/{p.targetWeeks || 0}</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progressPercent(p.qualifyingWeeks, p.targetWeeks)}%` }} />
                        </div>
                      </div>
                      {p.activeHoursPerDay > 0 ? (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-gray-400">
                            <span>Days with {p.activeHoursPerDay}h+ online</span>
                            <span>{p.qualifyingDays || 0}/{p.targetDays || 0}</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progressPercent(p.qualifyingDays, p.targetDays)}%` }} />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex justify-end">
                      <ClaimButton
                        item={milestone}
                        claimKey={claimKey}
                        claimingKey={claimingKey}
                        onClaim={() => handleClaim('milestone', milestone.id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Bonus boosters (weekly / monthly targets) */}
        {features.length > 0 ? (
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Bonus Boosters</h3>
            <div className="grid grid-cols-1 gap-3">
              {features.map((feature) => {
                const claimKey = `feature:${feature.key}`;
                const Icon = FEATURE_ICONS[feature.key] || Zap;
                const progress = feature.lowerIsBetter
                  ? (feature.currentValue <= feature.targetValue ? 100 : 0)
                  : progressPercent(feature.currentValue, feature.targetValue);

                return (
                  <div key={feature.key} className="border border-gray-100 rounded-3xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500">
                          <Icon size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{feature.label}</h4>
                          {feature.description ? <p className="text-[11px] text-gray-500">{feature.description}</p> : null}
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-300">{periodLabel(feature.period)}</p>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-green-600">{formatCurrency(feature.reward_amount)}</p>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-gray-400">
                        <span>{featureProgressText(feature)}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-black rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                      {feature.requirement ? <p className="text-[10px] text-amber-600">{feature.requirement}</p> : null}
                    </div>

                    <div className="mt-3 flex justify-end">
                      <ClaimButton
                        item={feature}
                        claimKey={claimKey}
                        claimingKey={claimingKey}
                        onClaim={() => handleClaim('feature', feature.key)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Referral: only when the admin has the program on, with its real amount and rule */}
        {referral.enabled ? (
          <section className="bg-black rounded-3xl p-6 text-white overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2">Invite a Driver</h3>
              <p className="text-sm text-gray-400 mb-6">{referralText(referral)}</p>
              <button
                type="button"
                onClick={() => navigate('/taxi/driver/referral')}
                className="px-6 py-3 bg-white text-black rounded-2xl text-xs font-bold uppercase tracking-widest"
              >
                Invite Now
              </button>
            </div>
            <Gift className="absolute -right-4 -bottom-4 text-white/10" size={120} />
          </section>
        ) : null}

        <p className="pb-10 text-center text-[10px] font-medium text-gray-300">
          Rewards are added to your wallet when you tap Claim. Progress updates after every completed trip.
        </p>
      </main>

      {statInfo ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45" onClick={() => setStatInfo(null)}>
          <div className="w-full max-w-md rounded-t-[28px] bg-white px-6 pb-8 pt-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-gray-900">{statInfo.title}</h3>
              <button type="button" onClick={() => setStatInfo(null)} className="text-gray-300" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <p className="mt-3 text-[13px] font-medium leading-relaxed text-gray-600">{statInfo.text}</p>
            {statInfo.extra ? (
              <p className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-[12px] font-semibold text-gray-600">{statInfo.extra}</p>
            ) : null}
            <button
              type="button"
              onClick={() => setStatInfo(null)}
              className="mt-5 h-12 w-full rounded-2xl bg-black text-[13px] font-bold text-white"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}

      <DriverBottomNav />
    </div>
  );
};

export default DriverIncentives;
