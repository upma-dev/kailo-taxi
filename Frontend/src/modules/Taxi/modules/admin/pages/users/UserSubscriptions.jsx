import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import SubscriptionPlanTable from '../../components/SubscriptionPlanTable';

const resultsOf = (response) => {
  const body = response?.data ?? response;
  if (Array.isArray(body?.results)) return body.results;
  return Array.isArray(body?.data?.results) ? body.data.results : [];
};

const UserSubscriptions = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    try {
      setPlans(resultsOf(await adminService.getUserSubscriptionPlans()));
    } catch (error) {
      toast.error(error?.message || 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredPlans = plans.filter((item) =>
    `${item.name || ''} ${item.vehicle_type_id?.name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-400">
            <span>Users</span>
            <ChevronRight size={12} />
            <span className="text-gray-700">Subscription Management</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Customer Subscription Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Riders buy a plan from their wallet. While it lasts, rides in that vehicle type are paid by the plan
            (the driver still gets their earning). Switch a plan off to stop selling it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/users/subscriptions/create')}
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Subscription
        </button>
      </div>

      <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
          <Search size={16} className="text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search customer subscription plans..."
            className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
        <SubscriptionPlanTable
          plans={filteredPlans}
          loading={loading}
          audience="user"
          onChanged={load}
          emptyText="No customer subscription plans found."
        />
      </div>
    </div>
  );
};

export default UserSubscriptions;
