import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RotateCcw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../services/adminService';

const CONFIG = {
  users: {
    title: 'Deleted Users',
    noun: 'user',
    list: () => adminService.getDeletedUsers(),
    restore: (id) => adminService.restoreDeletedUser(id),
    remove: (id) => adminService.permanentlyDeleteDeletedUser(id),
  },
  drivers: {
    title: 'Deleted Drivers',
    noun: 'driver',
    list: () => adminService.getDeletedDrivers(),
    restore: (id) => adminService.restoreDeletedDriver(id),
    remove: (id) => adminService.permanentlyDeleteDeletedDriver(id),
  },
};

const rowsOf = (response) => response?.data?.results || response?.results || response?.data?.data?.results || [];
const errorText = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const formatDate = (value) => (value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-');

// Accounts an admin deleted. They are only hidden: an admin can bring one back or remove it for good.
const DeletedAccounts = ({ kind = 'users' }) => {
  const config = CONFIG[kind] || CONFIG.users;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(rowsOf(await config.list()));
    } catch (error) {
      toast.error(errorText(error, `Could not load deleted ${config.noun}s.`));
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (item, action, message, confirmText) => {
    if (!window.confirm(confirmText)) return;
    const id = item.id || item._id;
    setBusyId(id);
    try {
      await action(id);
      toast.success(message);
      await load();
    } catch (error) {
      toast.error(errorText(error, 'Action failed.'));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{config.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          A deleted {config.noun} cannot sign in and is hidden from the lists. Restore brings the account back. Delete permanently removes it from the database and cannot be undone.
        </p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">Deleted on</th>
              <th className="px-5 py-3">Reason</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400"><Loader2 className="mx-auto animate-spin" size={22} /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No deleted {config.noun}s.</td></tr>
            ) : (
              items.map((item) => {
                const id = item.id || item._id;
                const busy = busyId === id;
                return (
                  <tr key={id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-bold text-slate-900">{item.name || '-'}</td>
                    <td className="px-5 py-3 font-semibold text-slate-600">{item.phone || item.mobile || '-'}</td>
                    <td className="px-5 py-3 font-semibold text-slate-600">{formatDate(item.deletedAt)}</td>
                    <td className="px-5 py-3 font-semibold text-slate-500">{String(item.deletion_reason || item.deletionReason || '-').replace(/_/g, ' ')}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => act(item, config.restore, `${config.noun} restored`, `Restore ${item.name || `this ${config.noun}`}?`)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          <RotateCcw size={13} /> Restore
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => act(item, config.remove, `${config.noun} removed for good`, `Permanently delete ${item.name || `this ${config.noun}`}? This cannot be undone.`)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-rose-600 disabled:opacity-60"
                        >
                          <Trash2 size={13} /> Delete permanently
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeletedAccounts;
