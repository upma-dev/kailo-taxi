import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { adminService } from '../services/adminService';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const MODE_LABEL = {
  commissionOnly: 'Commission only (plans are not used)',
  subscriptionOnly: 'Subscription only (a plan is needed to go online)',
  both: 'Subscription and commission (a plan waives commission)',
};
const STATUS_STYLE = {
  active: 'bg-emerald-50 text-emerald-700',
  upcoming: 'bg-indigo-50 text-indigo-700',
  expired: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-rose-50 text-rose-600',
};

/** Admin -> Driver details -> Subscription: the driver's plans. */
const DriverSubscriptionPanel = ({ driverId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    adminService
      .getDriverSubscriptionsById(driverId)
      .then((response) => {
        const value = response?.data ?? response;
        if (!cancelled) setData(Array.isArray(value?.results) ? value : value?.data || null);
      })
      .catch((err) => !cancelled && setError(err?.response?.data?.message || err?.message || 'Could not load subscriptions'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  if (loading) return <div className="flex justify-center py-12 text-gray-400"><Loader2 className="animate-spin" size={22} /></div>;
  if (error || !data) return <p className="py-10 text-center text-sm text-rose-500">{error || 'Could not load subscriptions'}</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Current plan</p>
          {data.active ? (
            <>
              <p className="mt-1 text-lg font-semibold text-gray-900">{data.active.name}</p>
              <p className="text-xs text-gray-500">Valid till {formatDate(data.active.expiresAt)} · {data.active.daysLeft} day(s) left</p>
            </>
          ) : (
            <p className="mt-1 text-lg font-semibold text-gray-400">No active plan</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Subscription mode</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{MODE_LABEL[data.mode] || data.mode}</p>
        </div>
      </div>

      {data.results.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">This driver has not bought any plan.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Paid</th>
                <th className="px-4 py-3 font-semibold">Bought on</th>
                <th className="px-4 py-3 font-semibold">Valid</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.results.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(item.purchasedAt)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(item.startsAt)} to {formatDate(item.expiresAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_STYLE[item.status] || STATUS_STYLE.expired}`}>{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DriverSubscriptionPanel;
