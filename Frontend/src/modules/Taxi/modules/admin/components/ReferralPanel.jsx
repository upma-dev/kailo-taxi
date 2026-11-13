import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3, Loader2, MinusCircle, UserPlus } from 'lucide-react';
import { adminService } from '../services/adminService';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const unwrap = (response) => {
  const body = response?.data ?? response;
  if (body && Array.isArray(body.results)) return body;
  return body?.data && Array.isArray(body.data.results) ? body.data : null;
};

const STATUS = {
  rewarded: { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  pending: { icon: Clock3, className: 'bg-amber-50 text-amber-700 border-amber-100' },
  no_reward: { icon: MinusCircle, className: 'bg-gray-50 text-gray-500 border-gray-200' },
};

export const ReferralStatusBadge = ({ row }) => {
  const style = STATUS[row?.status] || STATUS.no_reward;
  const Icon = style.icon;
  const text = row?.status === 'rewarded' && row?.rewardAmount
    ? `${formatCurrency(row.rewardAmount)} paid`
    : row?.status === 'pending' && row?.ridesNeeded
      ? `Pending · ${row.ridesDone ?? row.completedRides ?? 0}/${row.ridesNeeded} rides`
      : row?.label || '-';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style.className}`}>
      <Icon size={12} /> {text}
    </span>
  );
};

export const personLink = (kind, id) => (kind === 'driver' ? `/admin/drivers/${id}` : `/admin/users/${id}`);

/** Referral tab on the admin user / driver details page. */
const ReferralPanel = ({ kind, id }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    adminService
      .getReferralPeople(kind, id)
      .then((response) => {
        if (!cancelled) setData(unwrap(response));
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message || err?.message || 'Could not load referrals');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }
  if (error || !data) {
    return <p className="py-10 text-center text-sm text-rose-500">{error || 'Could not load referrals'}</p>;
  }

  const who = kind === 'driver' ? 'driver' : 'user';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Referral code</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 break-all">{data.referralCode || '-'}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">People referred</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{data.count}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Rewarded / pending</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {data.rewardedCount} <span className="text-base text-gray-400">/ {data.pendingCount}</span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Referral reward earned</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{formatCurrency(data.earned)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Referred by</p>
        {data.referredBy ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link to={personLink(kind, data.referredBy.id)} className="text-sm font-semibold text-indigo-600 hover:underline">
                {data.referredBy.name || 'Unnamed'}
              </Link>
              <p className="text-xs text-gray-500">
                {data.referredBy.phone} {data.referredBy.referralCode ? `· code ${data.referredBy.referralCode}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="mb-1 text-[11px] text-gray-400">Referrer's reward for this {who}</p>
              <ReferralStatusBadge row={data.referredBy} />
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">Joined without a referral code.</p>
        )}
      </div>

      <div className="rounded-xl border border-gray-100">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <UserPlus size={16} className="text-gray-400" />
          <p className="text-sm font-semibold text-gray-900">People this {who} referred ({data.count})</p>
        </div>
        {data.results.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">Nobody has joined with this {who}'s code yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  <th className="px-5 py-3 font-semibold">Completed rides</th>
                  <th className="px-5 py-3 font-semibold">Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.results.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3">
                      <Link to={personLink(kind, row.id)} className="font-medium text-indigo-600 hover:underline">
                        {row.name || 'Unnamed'}
                      </Link>
                      {row.deleted ? <span className="ml-2 text-[10px] text-rose-500">deleted</span> : null}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{row.phone}</td>
                    <td className="px-5 py-3 text-gray-600">{formatDate(row.joinedAt)}</td>
                    <td className="px-5 py-3 text-gray-600">{row.completedRides}</td>
                    <td className="px-5 py-3"><ReferralStatusBadge row={row} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralPanel;
