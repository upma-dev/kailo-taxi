import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import SubscriptionPlanTable from '../../components/SubscriptionPlanTable';

const body = (response) => {
  const value = response?.data ?? response;
  return value?.data !== undefined && value?.results === undefined && value?.mode === undefined ? value.data : value;
};

const MODES = [
  {
    id: 'commissionOnly',
    title: 'Commission only',
    text: 'No plans. Every ride pays the admin commission set in prices. Drivers do not see plans.',
  },
  {
    id: 'subscriptionOnly',
    title: 'Subscription only',
    text: 'Drivers must have an active plan to go online and get rides. No commission is taken from their rides.',
  },
  {
    id: 'both',
    title: 'Subscription and commission',
    text: 'Plans are optional. A driver with an active plan pays no commission; drivers without one pay the normal commission.',
  },
];

const DriverSubscriptions = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState('commissionOnly');
  const [savingMode, setSavingMode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [plans, setPlans] = useState([]);

  const load = useCallback(async () => {
    try {
      const [plansData, settingsData] = await Promise.all([
        adminService.getSubscriptionPlans(),
        adminService.getSubscriptionSettings(),
      ]);
      setPlans(body(plansData)?.results || []);
      setMode(body(settingsData)?.mode || 'commissionOnly');
    } catch (err) {
      toast.error(err?.message || 'Failed to load subscriptions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const chooseMode = async (next) => {
    if (next === mode) return;
    if (next === 'subscriptionOnly' && !window.confirm('Subscription only: drivers without an active plan will not be able to go online. Continue?')) {
      return;
    }
    setSavingMode(next);
    try {
      await adminService.updateSubscriptionSettings({ mode: next });
      setMode(next);
      toast.success(`Mode changed to "${MODES.find((item) => item.id === next)?.title}". It applies right away.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update settings');
    } finally {
      setSavingMode('');
    }
  };

  const filteredPlans = plans.filter((plan) => String(plan.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-400">
          <span>Drivers</span>
          <ChevronRight size={12} />
          <span className="text-gray-700">Subscription</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Driver Subscription</h1>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {MODES.map((item) => {
          const selected = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={Boolean(savingMode)}
              onClick={() => chooseMode(item.id)}
              className={`rounded-xl border-2 bg-white p-4 text-left shadow-sm transition-colors ${selected ? 'border-indigo-600' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                {selected ? <CheckCircle2 size={18} className="text-indigo-600" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">{item.text}</p>
              {savingMode === item.id ? <p className="mt-2 text-xs text-indigo-600">Saving...</p> : null}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold text-gray-900">Plans</p>
            <p className="text-xs text-gray-500">
              {mode === 'commissionOnly'
                ? 'Plans are kept but not shown to drivers while "Commission only" is selected.'
                : 'Drivers see the switched-on plans for their vehicle type in Profile → Subscription and pay from their wallet.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-56 rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/drivers/subscription/create')}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus size={15} /> Add Subscription
            </button>
          </div>
        </div>
        <div className="p-2">
          <SubscriptionPlanTable plans={filteredPlans} loading={isLoading} audience="driver" onChanged={load} emptyText="No driver plans yet." />
        </div>
      </div>
    </div>
  );
};

export default DriverSubscriptions;
