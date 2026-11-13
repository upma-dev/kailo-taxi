import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../shared/api/axiosInstance';

const DEFAULTS = {
  enabled: '1',
  cone_angle_degrees: '45',
  corridor_width_km: '3',
  max_uses_per_day: '2',
  max_duration_minutes: '180',
  arrival_radius_meters: '300',
};

const LIMITS = {
  cone_angle_degrees: { min: 10, max: 90 },
  corridor_width_km: { min: 0.5, max: 25 },
  max_uses_per_day: { min: 1, max: 20 },
  max_duration_minutes: { min: 15, max: 720 },
  arrival_radius_meters: { min: 50, max: 2000 },
};

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500';

const Field = ({ label, hint, name, value, onChange, suffix }) => (
  <div>
    <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="decimal"
        min={LIMITS[name].min}
        max={LIMITS[name].max}
        step={name === 'corridor_width_km' ? 0.5 : 1}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className={inputClass}
      />
      <span className="w-12 shrink-0 text-xs text-gray-400">{suffix}</span>
    </div>
    <p className="mt-1 text-[11px] text-gray-400">{hint} (allowed {LIMITS[name].min} - {LIMITS[name].max})</p>
  </div>
);

// Top-down picture of the rule: the driver is on the left, home on the right. A ride only qualifies
// when pickup and drop stay inside the corridor and the ride direction is inside the cone.
const RuleDiagram = ({ angle, widthKm }) => {
  const halfAngle = (Math.min(90, Math.max(10, Number(angle) || 45)) * Math.PI) / 180;
  const corridor = Math.min(70, Math.max(10, (Number(widthKm) || 3) * 9));
  const px = 150;
  const py = 90;
  const length = 150;
  const dx = Math.cos(halfAngle) * length;
  const dy = Math.sin(halfAngle) * length;

  return (
    <svg viewBox="0 0 360 180" className="w-full max-w-md rounded-xl border border-gray-100 bg-gray-50">
      <rect x="30" y={90 - corridor} width="300" height={corridor * 2} rx="10" fill="#6366f1" opacity="0.1" stroke="#6366f1" strokeDasharray="4 4" />
      <line x1="30" y1="90" x2="330" y2="90" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 4" />
      <path d={`M ${px} ${py} L ${px + dx} ${py - dy} A ${length} ${length} 0 0 1 ${px + dx} ${py + dy} Z`} fill="#10b981" opacity="0.18" />
      <line x1={px} y1={py} x2={px + dx} y2={py - dy} stroke="#10b981" strokeWidth="1.5" />
      <line x1={px} y1={py} x2={px + dx} y2={py + dy} stroke="#10b981" strokeWidth="1.5" />
      <circle cx="30" cy="90" r="7" fill="#0f172a" />
      <text x="30" y="118" textAnchor="middle" fontSize="10" fill="#475569">Driver</text>
      <circle cx={px} cy={py} r="5" fill="#10b981" />
      <text x={px} y={py + 18} textAnchor="middle" fontSize="10" fill="#475569">Pickup</text>
      <text x="330" y="118" textAnchor="end" fontSize="10" fill="#475569">Home</text>
      <circle cx="330" cy="90" r="7" fill="#f59e0b" />
      <text x="180" y="22" textAnchor="middle" fontSize="10" fill="#6366f1">Corridor ±{widthKm || 3} km</text>
      <text x={px + 60} y={py - dy * 0.45} fontSize="10" fill="#059669">Cone {angle || 45}°</text>
    </svg>
  );
};

const GoHomeSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(DEFAULTS);
  const [saved, setSaved] = useState(DEFAULTS);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/general-settings/go_home');
      const next = { ...DEFAULTS, ...(res.data?.settings || res.settings || {}) };
      setSettings(next);
      setSaved(next);
    } catch {
      toast.error('Failed to load Go Home settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(saved), [settings, saved]);
  const set = (name, value) => setSettings((current) => ({ ...current, [name]: String(value) }));
  const enabled = settings.enabled !== '0';

  const save = async () => {
    const payload = { ...settings };
    for (const [name, { min, max }] of Object.entries(LIMITS)) {
      const value = Number(payload[name]);
      if (!Number.isFinite(value) || value < min || value > max) {
        toast.error(`Enter a value between ${min} and ${max} for ${name.replace(/_/g, ' ')}`);
        return;
      }
    }
    try {
      setSaving(true);
      await api.patch('/admin/general-settings/go_home', { settings: payload });
      setSaved(payload);
      toast.success('Go Home settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="min-h-full bg-gray-50 p-6 font-sans lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Go Home Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Lets a driver at the end of the day receive only rides that are on the way to their home. Changes apply within a minute.
        </p>
      </div>

      <div className="mb-5 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-5">
        <div>
          <p className="text-sm font-semibold text-gray-800">Enable Go Home for drivers</p>
          <p className="text-xs text-gray-400">When off, the option stops working and active Go Home sessions end.</p>
        </div>
        <button
          type="button"
          onClick={() => set('enabled', enabled ? '0' : '1')}
          className={`relative h-7 w-14 rounded-full transition-colors ${enabled ? 'bg-[#405189]' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${enabled ? 'right-1' : 'left-1'}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Ride matching rules</h2>
          <div className="space-y-5">
            <Field
              label="Cone angle"
              name="cone_angle_degrees"
              suffix="deg"
              value={settings.cone_angle_degrees}
              onChange={set}
              hint="How far a ride's direction may differ from the direction to home. Smaller = stricter"
            />
            <Field
              label="Corridor width"
              name="corridor_width_km"
              suffix="km"
              value={settings.corridor_width_km}
              onChange={set}
              hint="How far pickup and drop may be from the straight line between driver and home"
            />
          </div>
          <h2 className="mb-4 mt-8 text-sm font-semibold text-gray-900">Limits</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Field label="Uses per day" name="max_uses_per_day" suffix="times" value={settings.max_uses_per_day} onChange={set} hint="Per driver" />
            <Field label="Max duration" name="max_duration_minutes" suffix="min" value={settings.max_duration_minutes} onChange={set} hint="Mode switches off after this" />
            <Field label="Arrival radius" name="arrival_radius_meters" suffix="m" value={settings.arrival_radius_meters} onChange={set} hint="Switches off near home" />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="flex items-center gap-2 rounded-lg bg-[#405189] px-6 py-2 text-sm font-semibold text-white hover:bg-[#344475] disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Save
            </button>
            {dirty ? <span className="text-xs font-semibold text-amber-600">Unsaved changes</span> : null}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">How a ride qualifies</h2>
          <p className="mb-4 text-xs text-gray-400">Live preview of the two shape settings.</p>
          <RuleDiagram angle={settings.cone_angle_degrees} widthKm={settings.corridor_width_km} />
          <ul className="mt-4 space-y-2 text-sm text-gray-500">
            <li>&bull; Drop must be at least 300 m closer to home than the pickup.</li>
            <li>&bull; Ride direction must be inside the green cone.</li>
            <li>&bull; Pickup and drop must be inside the blue corridor.</li>
            <li>&bull; Drivers in Go Home mode get no other rides (strict). Other drivers are not affected.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GoHomeSettings;
