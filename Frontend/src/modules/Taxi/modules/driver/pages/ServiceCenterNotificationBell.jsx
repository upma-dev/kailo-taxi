import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { getServiceCenterNotifications, readServiceCenterNotifications } from '../services/registrationService';

const unwrap = (response) => response?.data?.data || response?.data || response || {};

const EVENT_DOT = {
  new: 'bg-sky-500',
  assigned: 'bg-emerald-500',
  returned: 'bg-amber-500',
  cancelled: 'bg-rose-500',
};

const timeAgo = (value) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
};

// Alerts for the service center owner and staff. The owner hears about every request of the center; a staff
// member hears only about the requests handed to them (the server decides, this just shows the list).
const ServiceCenterNotificationBell = ({ onOpen }) => {
  const [data, setData] = useState({ unread: 0, results: [] });
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setData(unwrap(await getServiceCenterNotifications()));
    } catch {
      // Keep the last list; the next refresh will try again.
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 20000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const markAllRead = async () => {
    try {
      await readServiceCenterNotifications([]);
      setData((current) => ({ unread: 0, results: current.results.map((item) => ({ ...item, read: true })) }));
    } catch {
      // Not critical.
    }
  };

  const openItem = async (item) => {
    setOpen(false);
    if (!item.read) {
      readServiceCenterNotifications([item.id]).catch(() => {});
      setData((current) => ({
        unread: Math.max(0, current.unread - 1),
        results: current.results.map((row) => (row.id === item.id ? { ...row, read: true } : row)),
      }));
    }
    onOpen?.(item);
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) load();
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
        aria-label="Alerts"
      >
        <Bell size={20} />
        {data.unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
            {data.unread > 99 ? '99+' : data.unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-black text-slate-900">Alerts</p>
            {data.unread > 0 ? (
              <button type="button" onClick={markAllRead} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                <CheckCheck size={14} /> Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {data.results.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm font-semibold text-slate-400">No alerts yet.</p>
            ) : (
              data.results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${item.read ? '' : 'bg-emerald-50/50'}`}
                >
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${EVENT_DOT[item.event] || 'bg-slate-400'}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] text-slate-900 ${item.read ? 'font-semibold' : 'font-black'}`}>{item.title}</span>
                    <span className="block truncate text-xs font-semibold text-slate-500">{item.body}</span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-slate-400">{timeAgo(item.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ServiceCenterNotificationBell;
