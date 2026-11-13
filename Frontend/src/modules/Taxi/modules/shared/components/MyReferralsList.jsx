import React from 'react';
import { CheckCircle2, Clock3, MinusCircle } from 'lucide-react';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** The unwrapped body of GET /users/referrals/me or /drivers/referrals/me. */
export const unwrapMyReferrals = (response) => {
  const body = response?.data ?? response;
  if (body && Array.isArray(body.results)) return body;
  if (body?.data && Array.isArray(body.data.results)) return body.data;
  return null;
};

/** "How it works" text built from the live referral program, so it is always true. */
export const describeReferralProgram = (program, { audience = 'friend' } = {}) => {
  if (!program?.enabled) {
    return ['Share your code with friends. Rewards are switched off right now, but your invites are still counted.'];
  }
  const amount = formatCurrency(program.amount);
  const lines = [`Share your referral code with a ${audience}. They enter it while signing up.`];
  if (program.conditional) {
    lines.push(`You get ${amount} after they complete ${program.rideCount} ride${program.rideCount === 1 ? '' : 's'}.`);
  } else {
    lines.push(`You get ${amount} as soon as they sign up with your code.`);
  }
  if (program.bothGetReward) lines.push(`They also get ${amount}.`);
  lines.push('The reward goes straight to your wallet.');
  return lines;
};

const STATUS_STYLE = {
  rewarded: { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700' },
  pending: { icon: Clock3, className: 'bg-amber-50 text-amber-700' },
  no_reward: { icon: MinusCircle, className: 'bg-gray-100 text-gray-500' },
};

/** "My invites": summary + one row per person who joined with my code. */
const MyReferralsList = ({ data, accent = '#1830b8' }) => {
  if (!data) {
    return <p className="py-8 text-center text-sm text-gray-400">Could not load your referrals. Please try again.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-gray-50 px-3 py-3 text-center">
          <p className="text-[22px] font-semibold" style={{ color: accent }}>{data.count}</p>
          <p className="text-[10px] font-medium text-gray-500">Joined</p>
        </div>
        <div className="rounded-2xl bg-gray-50 px-3 py-3 text-center">
          <p className="text-[22px] font-semibold text-emerald-600">{data.rewardedCount}</p>
          <p className="text-[10px] font-medium text-gray-500">Rewarded</p>
        </div>
        <div className="rounded-2xl bg-gray-50 px-3 py-3 text-center">
          <p className="text-[22px] font-semibold text-gray-900">{formatCurrency(data.earned)}</p>
          <p className="text-[10px] font-medium text-gray-500">Earned</p>
        </div>
      </div>

      {data.results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center">
          <p className="text-sm font-medium text-gray-900">No one has joined with your code yet</p>
          <p className="mt-1 text-xs text-gray-400">Share your code. Everyone who signs up with it will show here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
          {data.results.map((row) => {
            const style = STATUS_STYLE[row.status] || STATUS_STYLE.no_reward;
            const Icon = style.icon;
            return (
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{row.name}</p>
                  <p className="text-[11px] text-gray-400">
                    {row.phone ? `${row.phone} · ` : ''}Joined {formatDate(row.joinedAt)}
                  </p>
                  {row.status === 'pending' && row.ridesNeeded ? (
                    <p className="mt-0.5 text-[11px] text-amber-600">Rides done: {row.ridesDone}/{row.ridesNeeded}</p>
                  ) : null}
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${style.className}`}>
                  <Icon size={12} />
                  {row.status === 'rewarded' && row.rewardAmount ? `${formatCurrency(row.rewardAmount)} paid` : row.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MyReferralsList;
