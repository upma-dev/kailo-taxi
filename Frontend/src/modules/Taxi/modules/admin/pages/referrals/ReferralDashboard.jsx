import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, IndianRupee, Loader2, Search, UserCheck, UserPlus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import { ReferralStatusBadge, personLink } from '../../components/ReferralPanel';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const body = (response) => {
  const value = response?.data ?? response;
  return value?.data && !value.total_users && !Array.isArray(value.results) ? value.data : value;
};

const StatCard = ({ title, value, hint, icon: Icon }) => (
  <div className="flex h-full flex-col justify-between rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-gray-500">{title}</p>
        <h3 className="text-2xl font-black leading-none text-gray-900">{value}</h3>
      </div>
      <div className="rounded-lg bg-gray-50 p-2 text-gray-400">
        <Icon size={20} />
      </div>
    </div>
    {hint ? <p className="mt-4 text-[11px] font-medium text-gray-400">{hint}</p> : null}
  </div>
);

const ShareBar = ({ normal, referred, normalLabel, referredLabel, color }) => {
  const total = normal + referred;
  const percent = total > 0 ? Math.round((referred / total) * 100) : 0;
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-black text-gray-900">{percent}%</p>
          <p className="text-xs text-gray-500">joined with a referral code</p>
        </div>
        <p className="text-xs text-gray-400">{total} total</p>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="flex items-center gap-2 text-gray-600">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /> {referredLabel}: <b>{referred}</b>
        </span>
        <span className="flex items-center gap-2 text-gray-600">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" /> {normalLabel}: <b>{normal}</b>
        </span>
      </div>
    </div>
  );
};

const MonthlyBars = ({ data = [], color }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-44 flex-col justify-between">
      <div className="flex flex-1 items-end gap-1.5">
        {data.map((value, index) => (
          <div key={MONTHS[index]} className="flex h-full flex-1 flex-col items-center justify-end" title={`${MONTHS[index]}: ${value}`}>
            {value > 0 ? <span className="mb-1 text-[10px] font-bold text-gray-500">{value}</span> : null}
            <div
              className="w-full rounded-t-sm"
              style={{ height: `${(value / max) * 100}%`, minHeight: value > 0 ? 4 : 2, backgroundColor: value > 0 ? color : '#F3F4F6' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between">
        {MONTHS.map((month) => (
          <span key={month} className="flex-1 text-center text-[9px] font-bold uppercase text-gray-400">{month}</span>
        ))}
      </div>
    </div>
  );
};

const Section = ({ title, stats, color, normalLabel, referredLabel, year }) => (
  <div className="grid grid-cols-12 gap-6">
    <div className="col-span-12 rounded-lg border border-gray-100 bg-white p-6 shadow-sm lg:col-span-5">
      <h3 className="mb-6 text-[12px] font-black uppercase tracking-widest text-gray-900">{title}</h3>
      <ShareBar
        normal={stats?.[normalLabel.key] || 0}
        referred={stats?.[referredLabel.key] || 0}
        normalLabel={normalLabel.label}
        referredLabel={referredLabel.label}
        color={color}
      />
      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-gray-50 pt-5 text-sm">
        <div>
          <p className="text-xs text-gray-400">People who referred</p>
          <p className="font-bold text-gray-900">{stats?.referrers || 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Rewards paid</p>
          <p className="font-bold text-emerald-600">{formatCurrency(stats?.paid)}</p>
        </div>
      </div>
    </div>
    <div className="col-span-12 rounded-lg border border-gray-100 bg-white p-6 shadow-sm lg:col-span-7">
      <h3 className="mb-6 text-[12px] font-black uppercase tracking-widest text-gray-900">Referral sign-ups by month ({year})</h3>
      <MonthlyBars data={stats?.monthly || Array(12).fill(0)} color={color} />
    </div>
  </div>
);

const ReferralTable = () => {
  const [kind, setKind] = useState('user');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ results: [], total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminService
      .listReferrals({ kind, page, limit: 20, search: query })
      .then((response) => {
        if (!cancelled) setResult(body(response) || { results: [], total: 0, limit: 20 });
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load referrals');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, page, query]);

  const pages = Math.max(1, Math.ceil((result.total || 0) / (result.limit || 20)));

  return (
    <div className="rounded-lg border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-1 rounded-xl bg-gray-50 p-1">
          {[['user', 'Users'], ['driver', 'Drivers']].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setKind(value);
                setPage(1);
              }}
              className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest ${kind === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
          <Search size={14} className="text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search joined person by name or phone"
            className="w-64 text-sm outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-14 text-gray-400"><Loader2 className="animate-spin" size={22} /></div>
      ) : result.results.length === 0 ? (
        <p className="py-14 text-center text-sm text-gray-400">
          {query ? 'No referral matches this search.' : `No ${kind === 'driver' ? 'driver' : 'user'} has joined with a referral code yet.`}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-6 py-3 font-semibold">Joined person</th>
                <th className="px-6 py-3 font-semibold">Referred by</th>
                <th className="px-6 py-3 font-semibold">Joined on</th>
                <th className="px-6 py-3 font-semibold">Completed rides</th>
                <th className="px-6 py-3 font-semibold">Referrer's reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {result.results.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-3">
                    <Link to={personLink(row.kind, row.id)} className="font-medium text-indigo-600 hover:underline">{row.name || 'Unnamed'}</Link>
                    <p className="text-xs text-gray-400">{row.phone}{row.deleted ? ' · deleted' : ''}</p>
                  </td>
                  <td className="px-6 py-3">
                    {row.referrer ? (
                      <>
                        <Link to={personLink(row.kind, row.referrer.id)} className="font-medium text-indigo-600 hover:underline">
                          {row.referrer.name || 'Unnamed'}
                        </Link>
                        <p className="text-xs text-gray-400">{row.referrer.phone} · {row.referrer.referralCode}</p>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">Referrer account removed</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(row.joinedAt)}</td>
                  <td className="px-6 py-3 text-gray-600">{row.completedRides}</td>
                  <td className="px-6 py-3"><ReferralStatusBadge row={row} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 text-xs text-gray-500">
        <span>{result.total || 0} referral{result.total === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-40">
            <ChevronLeft size={14} />
          </button>
          <span>Page {page} / {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-40">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ReferralDashboard = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminService
      .getReferralDashboard()
      .then((response) => setData(body(response)))
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 font-sans text-gray-900">
      <div className="flex items-center justify-between">
        <h1 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-950">Referral Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total users" value={data?.total_users ?? 0} icon={UserCheck} hint={`${data?.user_referrals?.referral_user ?? 0} joined with a referral code`} />
        <StatCard title="Total drivers" value={data?.total_drivers ?? 0} icon={Users} hint={`${data?.driver_referrals?.referral_driver ?? 0} joined with a referral code`} />
        <StatCard title="People who referred" value={data?.active_referrals ?? 0} icon={UserPlus} hint={`${data?.total_referrals ?? 0} people joined through them`} />
        <StatCard title="Referral rewards paid" value={formatCurrency(data?.referral_earning)} icon={IndianRupee} hint="Credited to wallets (referrers and new members)" />
      </div>

      <Section
        title="User referrals"
        stats={data?.user_referrals}
        color="#2563EB"
        year={data?.year}
        normalLabel={{ key: 'normal_user', label: 'Without code' }}
        referredLabel={{ key: 'referral_user', label: 'With code' }}
      />
      <Section
        title="Driver referrals"
        stats={data?.driver_referrals}
        color="#059669"
        year={data?.year}
        normalLabel={{ key: 'normal_driver', label: 'Without code' }}
        referredLabel={{ key: 'referral_driver', label: 'With code' }}
      />

      <div className="space-y-3">
        <h2 className="text-[12px] font-black uppercase tracking-widest text-gray-900">All referrals: who referred whom</h2>
        <ReferralTable />
      </div>
    </div>
  );
};

export default ReferralDashboard;
