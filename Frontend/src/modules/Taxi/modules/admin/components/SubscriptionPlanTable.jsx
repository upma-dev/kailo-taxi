import React, { useState } from 'react';
import { Loader2, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../services/adminService';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const errorText = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const vehicleName = (plan) => plan?.vehicle_type_id?.name || plan?.vehicle_type?.name || 'All vehicles';

const EditPlanModal = ({ plan, audience, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: plan.name || '',
    description: plan.description || '',
    amount: plan.amount ?? '',
    duration: plan.duration ?? '',
    benefit_type: plan.benefit_type === 'unlimited' ? 'unlimited' : 'limited',
    ride_limit: plan.ride_limit || 1,
  });
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        amount: Number(form.amount),
        duration: Number(form.duration),
        ...(audience === 'user' ? { benefit_type: form.benefit_type, ride_limit: Number(form.ride_limit) } : {}),
      };
      await adminService.updateSubscriptionPlan(plan._id || plan.id, payload);
      toast.success('Plan updated. Changes apply to new purchases.');
      onSaved();
    } catch (error) {
      toast.error(errorText(error, 'Could not update plan'));
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500';
  const label = 'mb-1 block text-xs font-semibold text-gray-500';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Edit plan</h3>
          <button type="button" onClick={onClose} className="text-gray-400"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div><label className={label}>Name</label><input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div><label className={label}>Description</label><input className={input} value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Price (₹)</label><input type="number" min={1} className={input} value={form.amount} onChange={(e) => set('amount', e.target.value)} /></div>
            <div><label className={label}>Duration (days)</label><input type="number" min={1} className={input} value={form.duration} onChange={(e) => set('duration', e.target.value)} /></div>
          </div>
          {audience === 'user' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Benefit</label>
                <select className={input} value={form.benefit_type} onChange={(e) => set('benefit_type', e.target.value)}>
                  <option value="limited">Limited rides</option>
                  <option value="unlimited">Unlimited rides</option>
                </select>
              </div>
              {form.benefit_type === 'limited' ? (
                <div><label className={label}>Number of rides</label><input type="number" min={1} className={input} value={form.ride_limit} onChange={(e) => set('ride_limit', e.target.value)} /></div>
              ) : null}
            </div>
          ) : null}
          <p className="text-[11px] text-gray-400">People who already bought this plan keep what they paid for.</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button type="button" disabled={saving} onClick={save} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Plans table for Admin -> Users / Drivers -> Subscription: edit, switch on/off, delete. */
const SubscriptionPlanTable = ({ plans, loading, audience, onChanged, emptyText = 'No plans yet.' }) => {
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState('');

  const toggle = async (plan) => {
    const id = plan._id || plan.id;
    setBusyId(id);
    try {
      await adminService.updateSubscriptionPlan(id, { active: !plan.active });
      toast.success(plan.active ? 'Plan switched off. It is no longer sold.' : 'Plan switched on.');
      onChanged();
    } catch (error) {
      toast.error(errorText(error, 'Could not change the plan'));
    } finally {
      setBusyId('');
    }
  };

  const remove = async (plan) => {
    if (!window.confirm(`Delete "${plan.name}"? If someone already bought it, it is switched off instead.`)) return;
    const id = plan._id || plan.id;
    setBusyId(id);
    try {
      const response = await adminService.deleteSubscriptionPlan(id);
      const result = response?.data?.data || response?.data || {};
      toast.success(result.deleted ? 'Plan deleted.' : result.message || 'Plan switched off.');
      onChanged();
    } catch (error) {
      toast.error(errorText(error, 'Could not delete the plan'));
    } finally {
      setBusyId('');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div>;
  }
  if (!plans.length) {
    return <div className="py-16 text-center text-sm font-semibold text-slate-400">{emptyText}</div>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Vehicle type</th>
              {audience === 'user' ? <th className="px-4 py-3">Benefit</th> : null}
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => {
              const id = plan._id || plan.id;
              return (
                <tr key={id} className="border-b border-slate-50">
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-900">{plan.name}</p>
                    {plan.description ? <p className="text-xs text-slate-500">{plan.description}</p> : null}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{vehicleName(plan)}</td>
                  {audience === 'user' ? (
                    <td className="px-4 py-4 text-slate-600">{plan.benefit_type === 'unlimited' ? 'Unlimited rides' : `${plan.ride_limit} rides`}</td>
                  ) : null}
                  <td className="px-4 py-4 text-slate-600">{plan.duration} day{Number(plan.duration) === 1 ? '' : 's'}</td>
                  <td className="px-4 py-4 font-bold text-slate-900">{formatCurrency(plan.amount)}</td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      disabled={busyId === id}
                      onClick={() => toggle(plan)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${plan.active ? 'bg-emerald-500' : 'bg-gray-200'} disabled:opacity-60`}
                      title={plan.active ? 'On sale: click to switch off' : 'Switched off: click to switch on'}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${plan.active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => setEditing(plan)} className="rounded-lg p-2 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button type="button" disabled={busyId === id} onClick={() => remove(plan)} className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing ? (
        <EditPlanModal
          plan={editing}
          audience={audience}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      ) : null}
    </>
  );
};

export default SubscriptionPlanTable;
