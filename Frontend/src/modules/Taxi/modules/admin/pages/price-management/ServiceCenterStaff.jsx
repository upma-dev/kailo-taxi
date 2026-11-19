import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, UserCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100/60';

const rowsOf = (payload) => payload?.data?.data?.results || payload?.data?.results || payload?.results || [];

const EMPTY_FORM = { name: '', phone: '', serviceCenterId: '' };

// Admin view of the staff of every service center: add, edit, switch on or off, and remove.
// A center's owner can also manage the staff of their own center in the center app.
const ServiceCenterStaff = () => {
  const [staff, setStaff] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [centerFilter, setCenterFilter] = useState('');
  const [form, setForm] = useState(null); // null = closed, otherwise { id?, name, phone, serviceCenterId }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [staffResponse, storeResponse] = await Promise.all([
        adminService.getServiceCenterStaff(),
        adminService.getServiceStores(),
      ]);
      setStaff(rowsOf(staffResponse));
      setCenters(rowsOf(storeResponse).map((row) => ({ id: String(row.id || row._id), name: row.name || 'Service center' })));
    } catch (error) {
      toast.error(error?.message || 'Could not load the staff list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => (centerFilter ? staff.filter((member) => member.serviceCenterId === centerFilter) : staff),
    [staff, centerFilter],
  );

  const submit = async (event) => {
    event.preventDefault();
    if (!form) return;
    const phone = String(form.phone || '').replace(/\D/g, '').slice(-10);
    if (!form.name.trim()) return toast.error('Enter the staff name.');
    if (phone.length !== 10) return toast.error('Enter a valid 10-digit login number.');
    if (!form.serviceCenterId) return toast.error('Choose the service center.');

    setSaving(true);
    try {
      const body = { name: form.name.trim(), phone, serviceCenterId: form.serviceCenterId };
      if (form.id) await adminService.updateServiceCenterStaff(form.id, body);
      else await adminService.createServiceCenterStaff(body);
      toast.success(form.id ? 'Staff member updated' : 'Staff member added');
      setForm(null);
      await load();
    } catch (error) {
      toast.error(error?.message || 'Could not save the staff member.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member) => {
    try {
      await adminService.updateServiceCenterStaff(member.id, { active: !member.active });
      setStaff((current) => current.map((row) => (row.id === member.id ? { ...row, active: !member.active, status: member.active ? 'inactive' : 'active' } : row)));
    } catch (error) {
      toast.error(error?.message || 'Could not change the status.');
    }
  };

  const remove = async (member) => {
    if (!window.confirm(`Remove ${member.name} from ${member.serviceCenterName || 'the service center'}?`)) return;
    try {
      await adminService.deleteServiceCenterStaff(member.id);
      setStaff((current) => current.filter((row) => row.id !== member.id));
      toast.success('Staff member removed');
    } catch (error) {
      toast.error(error?.message || 'Could not remove the staff member.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Center Staff</h1>
          <p className="mt-1 text-sm text-slate-500">
            The people who work at your service centers. They log in to the center app with their phone number and see the requests handed to them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...EMPTY_FORM, serviceCenterId: centerFilter })}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2e3c78] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#25316a]"
        >
          <Plus size={16} /> Add staff
        </button>
      </div>

      <div className="mb-5 max-w-xs">
        <select value={centerFilter} onChange={(event) => setCenterFilter(event.target.value)} className={inputClass}>
          <option value="">All service centers</option>
          {centers.map((center) => (
            <option key={center.id} value={center.id}>
              {center.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Login number</th>
              <th className="px-5 py-3">Service center</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-slate-400">Loading staff...</td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-slate-400">No staff members yet.</td>
              </tr>
            ) : (
              visible.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-bold text-slate-900">
                    <span className="inline-flex items-center gap-2"><UserCheck size={15} className="text-slate-400" />{member.name}</span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-600">{member.phone}</td>
                  <td className="px-5 py-3 font-semibold text-slate-600">{member.serviceCenterName || '-'}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(member)}
                      className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${member.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {member.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ id: member.id, name: member.name, phone: member.phone, serviceCenterId: member.serviceCenterId })}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-slate-300 hover:text-slate-800"
                        aria-label="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(member)}
                        className="rounded-lg border border-slate-200 p-2 text-rose-500 hover:border-rose-200 hover:bg-rose-50"
                        aria-label="Remove"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{form.id ? 'Edit staff member' : 'Add staff member'}</h2>
              <button type="button" onClick={() => setForm(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Staff name"
              className={inputClass}
            />
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="Login phone number (10 digits)"
              inputMode="numeric"
              className={inputClass}
            />
            <select value={form.serviceCenterId} onChange={(event) => setForm({ ...form, serviceCenterId: event.target.value })} className={inputClass}>
              <option value="">Choose service center</option>
              {centers.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-[#2e3c78] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#25316a] disabled:opacity-60"
            >
              {saving ? 'Saving...' : form.id ? 'Save changes' : 'Add staff'}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
};

export default ServiceCenterStaff;
