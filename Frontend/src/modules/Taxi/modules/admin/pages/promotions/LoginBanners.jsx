import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-react';
import api from '../../../../shared/api/axiosInstance';
import { BANNER_THEMES, BannerCard, BannerStrip } from '@/shared/components/auth/LoginBanners';

const unwrap = (response) => response?.data?.data || response?.data || response;
const errorMessage = (err) => err?.response?.data?.message || err?.message || 'Something went wrong';

const emptyForm = (app) => ({ app, tag: '', code: '', title: '', subtitle: '', theme: 'brand', image: '', video: '', link: '', active: true });

const Toggle = ({ checked, onChange, color = 'bg-indigo-600' }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? color : 'bg-gray-300'}`}
  >
    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
  </button>
);

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500';

const BannerModal = ({ initial, onClose, onSaved }) => {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(initial._id);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) await api.patch(`/admin/login-banners/${initial._id}`, form);
      else await api.post('/admin/login-banners', form);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <form onSubmit={submit} className="my-auto w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit Banner' : 'Add New Banner'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="mb-4 rounded-xl bg-gray-50 p-3">
          <BannerCard banner={form} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Show in app</label>
            <select value={form.app} onChange={(e) => set('app', e.target.value)} className={inputClass}>
              <option value="user">User App</option>
              <option value="partner">Partner App (Driver / Owner)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Color theme</label>
            <select value={form.theme} onChange={(e) => set('theme', e.target.value)} className={inputClass}>
              {Object.entries(BANNER_THEMES).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Badge text</label>
            <input value={form.tag} onChange={(e) => set('tag', e.target.value)} placeholder="WELCOME OFFER" className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Promo code (optional)</label>
            <input value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="FIRST100" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gray-500">Title *</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Flat Rs.100 OFF on first ride" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gray-500">Description</label>
            <input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="Use code at checkout" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gray-500">Short video URL (optional, .mp4 plays muted on loop)</label>
            <input value={form.video} onChange={(e) => set('video', e.target.value)} placeholder="https://.../offer.mp4" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gray-500">Background / poster image URL (optional)</label>
            <input value={form.image} onChange={(e) => set('image', e.target.value)} placeholder="https://..." className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gray-500">Link when tapped (optional)</label>
            <input value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="https://..." className={inputClass} />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Toggle checked={form.active} onChange={(v) => set('active', v)} />
            <span className="text-sm text-gray-600">{form.active ? 'Active' : 'Hidden'}</span>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Saving...' : isEdit ? 'Update Banner' : 'Add Banner'}
          </button>
        </div>
      </form>
    </div>
  );
};

const StatCard = ({ label, value, color = 'text-gray-900' }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
    <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
  </div>
);

const LoginBanners = () => {
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState({ user_enabled: true, partner_enabled: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('user');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = unwrap(await api.get('/admin/login-banners'));
      setBanners(Array.isArray(data?.results) ? data.results : []);
      if (data?.settings) setSettings(data.settings);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    try {
      await fn();
      await load();
    } catch (err) {
      window.alert(errorMessage(err));
    }
  };

  const visible = useMemo(
    () => (tab === 'all' ? banners : banners.filter((b) => b.app === tab)),
    [banners, tab],
  );
  const count = (app) => banners.filter((b) => b.app === app).length;
  const previewApp = tab === 'partner' ? 'partner' : 'user';
  const previewBanners = banners.filter((b) => b.app === previewApp && b.active);

  const toggleSetting = (key, value) =>
    run(async () => {
      setSettings((s) => ({ ...s, [key]: value }));
      await api.patch('/admin/login-banners/settings', { [key]: value });
    });

  const move = (banner, delta) =>
    run(async () => {
      const group = banners.filter((b) => b.app === banner.app);
      const from = group.findIndex((b) => b._id === banner._id);
      const to = from + delta;
      if (to < 0 || to >= group.length) return;
      const ids = group.map((b) => b._id);
      [ids[from], ids[to]] = [ids[to], ids[from]];
      await api.post('/admin/login-banners/reorder', { ids });
    });

  const remove = (banner) => {
    if (!window.confirm('Delete this banner?')) return;
    run(() => api.delete(`/admin/login-banners/${banner._id}`));
  };

  const tabs = [
    { id: 'user', label: `User App Banners (${count('user')})` },
    { id: 'partner', label: `Partner App Banners (${count('partner')})` },
    { id: 'all', label: `All (${banners.length})` },
  ];

  return (
    <div className="min-h-full bg-gray-50 text-gray-900">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Login Screen Banners &amp; Offers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Control the banners and promotional offers shown above the login form in the user and partner apps. Changes go live instantly.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-500 hover:bg-gray-50" title="Refresh">
            <RefreshCw size={16} />
          </button>
          {banners.length === 0 && !loading ? (
            <button
              type="button"
              onClick={() => run(() => api.post('/admin/login-banners/seed'))}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Sparkles size={15} /> Seed Recommended
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setModal(emptyForm(previewApp))}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus size={16} /> Add New Banner
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total banners" value={banners.length} />
        <StatCard label="Active banners" value={banners.filter((b) => b.active).length} color="text-emerald-600" />
        <StatCard label="User app" value={count('user')} />
        <StatCard label="Partner app" value={count('partner')} color="text-purple-600" />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          { key: 'user_enabled', title: 'User App Login Banners', hint: 'Banners are shown on the customer login screen', color: 'bg-indigo-600' },
          { key: 'partner_enabled', title: 'Partner App Login Banners', hint: 'Banners are shown on the driver / owner login screen', color: 'bg-purple-600' },
        ].map((s) => (
          <div key={s.key} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
            <div>
              <p className="text-sm font-semibold">
                {s.title}{' '}
                <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${settings[s.key] ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                  {settings[s.key] ? 'ENABLED' : 'DISABLED'}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-gray-400">{s.hint}</p>
            </div>
            <Toggle checked={Boolean(settings[s.key])} onChange={(v) => toggleSetting(s.key, v)} color={s.color} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${tab === t.id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-600" /></div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-red-500">{error}</p>
          ) : visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white py-14 text-center text-sm text-gray-400">
              No banners yet. Click &ldquo;Add New Banner&rdquo; to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((banner) => {
                const group = banners.filter((b) => b.app === banner.app);
                const idx = group.findIndex((b) => b._id === banner._id);
                return (
                  <div key={banner._id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
                    <div className="min-w-0 flex-1"><BannerCard banner={banner} compact /></div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{banner.active ? 'Active' : 'Hidden'}</span>
                        <Toggle
                          checked={banner.active}
                          onChange={(v) => run(() => api.patch(`/admin/login-banners/${banner._id}`, { active: v }))}
                        />
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <button type="button" disabled={idx === 0} onClick={() => move(banner, -1)} className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30"><ArrowUp size={14} /></button>
                        <button type="button" disabled={idx === group.length - 1} onClick={() => move(banner, 1)} className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30"><ArrowDown size={14} /></button>
                        <button type="button" onClick={() => setModal({ ...emptyForm(banner.app), ...banner })} className="rounded p-1.5 hover:bg-indigo-50 hover:text-indigo-600"><Pencil size={14} /></button>
                        <button type="button" onClick={() => remove(banner)} className="rounded p-1.5 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Live preview · {previewApp === 'user' ? 'User app' : 'Partner app'}
          </p>
          <div className="mx-auto w-[260px] rounded-[2rem] border-[6px] border-gray-900 bg-white p-4">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200" />
            {settings[previewApp === 'user' ? 'user_enabled' : 'partner_enabled'] && previewBanners.length ? (
              <BannerStrip banners={previewBanners} compact />
            ) : (
              <p className="rounded-lg bg-gray-50 py-4 text-center text-[11px] text-gray-400">No banner will be shown</p>
            )}
            <p className="mt-5 text-center text-sm font-bold text-gray-800">Sign in to account</p>
            <p className="mt-1 text-center text-[10px] text-gray-400">Enter your mobile number to get started</p>
            <div className="mt-3 h-9 rounded-lg border border-gray-200 bg-gray-50" />
            <div className="mt-2 h-9 rounded-lg bg-gray-800" />
          </div>
        </div>
      </div>

      {modal ? (
        <BannerModal
          initial={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      ) : null}
    </div>
  );
};

const LOOK_DEFAULTS = {
  header_from: '#0F766E',
  header_to: '#0A4A46',
  accent_color: '#C6F432',
  tagline: '',
  show_support: true,
  support_text: '',
  support_label: '',
  support_link: '',
  copyright_text: '',
};

const SHARED_KEYS = ['header_from', 'header_to', 'accent_color', 'support_text', 'support_label', 'support_link', 'copyright_text'];

// Saved settings -> editable form for one app. The partner app falls back to the user
// app's values until it has been customised, so nothing that is already saved is lost.
const formFromSettings = (settings = {}, app = 'user') => {
  const form = { ...LOOK_DEFAULTS };
  SHARED_KEYS.forEach((key) => {
    const own = app === 'partner' ? settings[`partner_${key}`] : undefined;
    const value = own !== undefined && own !== null && own !== '' ? own : settings[key];
    if (value !== undefined && value !== null) form[key] = value;
  });
  const ownSupport = app === 'partner' ? settings.partner_show_support : null;
  form.show_support = ownSupport !== undefined && ownSupport !== null ? ownSupport !== false : settings.show_support !== false;
  form.tagline = (app === 'partner' ? settings.tagline_partner : settings.tagline_user) || '';
  return form;
};

const payloadFromForm = (form, app) => {
  const prefix = app === 'partner' ? 'partner_' : '';
  const payload = {
    [`${prefix}show_support`]: Boolean(form.show_support),
    [app === 'partner' ? 'tagline_partner' : 'tagline_user']: form.tagline,
  };
  SHARED_KEYS.forEach((key) => { payload[`${prefix}${key}`] = form[key]; });
  return payload;
};

const APP_META = {
  user: { label: 'User App', hint: 'Customer login screen', brandLine: 'Kailo Taxi', sheetTitle: 'Sign in' },
  partner: { label: 'Driver / Owner App', hint: 'Driver & fleet owner login screen', brandLine: 'Kailo Partner', sheetTitle: 'Partner login' },
};

const ColorInput = ({ label, value, onChange }) => (
  <div>
    <label className="mb-1 block text-xs font-semibold text-gray-500">{label}</label>
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded border border-gray-200 bg-white p-1" />
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  </div>
);

const CONTACT_PAGE_LINK = '/taxi/contact';

// What the support link opens. The admin picks a type and types only the number / email / URL;
// the real link (tel:, mailto:, wa.me ...) is built from it and saved in `support_link`.
const LINK_TYPES = [
  { id: 'contact', label: 'Contact Us page', hint: '' },
  { id: 'phone', label: 'Phone call', hint: 'Phone number, e.g. 7409129517' },
  { id: 'whatsapp', label: 'WhatsApp chat', hint: 'WhatsApp number with country code, e.g. 917409129517' },
  { id: 'email', label: 'Email', hint: 'Email address, e.g. support@kailotaxi.com' },
  { id: 'url', label: 'Website link', hint: 'Full link, e.g. https://kailotaxi.com/help' },
];

const detectLink = (link = '') => {
  const value = String(link || '').trim();
  if (!value || value === CONTACT_PAGE_LINK) return { type: 'contact', input: '' };
  if (value.startsWith('tel:')) return { type: 'phone', input: value.slice(4) };
  if (value.startsWith('mailto:')) return { type: 'email', input: value.slice(7) };
  const wa = value.match(/^https?:\/\/wa\.me\/(\d+)/i);
  if (wa) return { type: 'whatsapp', input: wa[1] };
  return { type: 'url', input: value };
};

const buildLink = (type, input) => {
  const value = String(input || '').trim();
  if (type === 'contact') return CONTACT_PAGE_LINK;
  if (type === 'phone') return value ? `tel:${value.replace(/[^\d+]/g, '')}` : '';
  if (type === 'whatsapp') return value ? `https://wa.me/${value.replace(/\D/g, '')}` : '';
  if (type === 'email') return value ? `mailto:${value}` : '';
  if (!value) return '';
  return /^(https?:\/\/|\/)/i.test(value) ? value : `https://${value}`;
};

const SupportLinkField = ({ value, onChange }) => {
  const detected = detectLink(value);
  const [type, setType] = useState(detected.type);
  const [input, setInput] = useState(detected.input);

  // Follow the saved value when it changes from outside (load, discard, save).
  useEffect(() => {
    if (buildLink(type, input) !== String(value || '').trim()) {
      const next = detectLink(value);
      setType(next.type);
      setInput(next.input);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const meta = LINK_TYPES.find((t) => t.id === type);
  const change = (nextType, nextInput) => {
    setType(nextType);
    setInput(nextInput);
    onChange(buildLink(nextType, nextInput));
  };

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-500">Support link opens</label>
      <select value={type} onChange={(e) => change(e.target.value, '')} className={inputClass}>
        {LINK_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      {type === 'contact' ? (
        <p className="mt-1 text-[11px] text-gray-400">Opens the Contact Us page (edit it in the Contact page section below).</p>
      ) : (
        <>
          <input value={input} onChange={(e) => change(type, e.target.value)} placeholder={meta.hint} className={`${inputClass} mt-2`} />
          {value ? <p className="mt-1 break-all text-[11px] text-gray-400">Link: {value}</p> : <p className="mt-1 text-[11px] text-amber-600">Enter a value, otherwise the link will not work.</p>}
        </>
      )}
    </div>
  );
};

const TextInput = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="mb-1 block text-xs font-semibold text-gray-500">{label}</label>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />
  </div>
);

const PhonePreview = ({ form, app, banners, enabled }) => {
  const meta = APP_META[app];
  const shown = enabled ? banners.filter((b) => b.app === app && b.active) : [];
  return (
    <div className="mx-auto w-[280px] overflow-hidden rounded-[2.2rem] border-[7px] border-gray-900 bg-white shadow-xl">
      <div className="flex h-[520px] flex-col" style={{ background: `linear-gradient(180deg, ${form.header_from} 0%, ${form.header_to} 100%)` }}>
        <div className="px-3 pb-6 pt-5 text-center">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/30" />
          {shown.length ? (
            <div className="mb-3"><BannerStrip banners={shown} compact /></div>
          ) : (
            <p className="mb-3 rounded-lg bg-white/10 py-3 text-[10px] text-white/70">No banner will be shown</p>
          )}
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-black shadow-lg" style={{ color: form.header_to }}>K</div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-[17px] font-black leading-none text-white">{meta.brandLine}</span>
            {app === 'partner' ? (
              <span className="rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#14213D]" style={{ background: form.accent_color }}>Partner</span>
            ) : null}
          </div>
          {form.tagline ? <p className="mx-auto mt-1.5 max-w-[24ch] text-[10px] font-semibold leading-snug text-white/80">{form.tagline}</p> : null}
        </div>
        <div className="flex flex-1 flex-col rounded-t-[1.6rem] bg-white px-4 pb-3 pt-5 text-center">
          <p className="text-[15px] font-extrabold uppercase tracking-wide text-[#0B3B36]">{meta.sheetTitle}</p>
          <span className="mx-auto mb-2 mt-1 block h-1 w-10 rounded-full" style={{ background: form.accent_color }} />
          <p className="text-[10px] text-gray-400">Enter your mobile number to get started</p>
          <div className="mt-3 h-9 rounded-lg border border-gray-200 bg-gray-50" />
          <div className="mt-2 h-9 rounded-lg" style={{ background: form.header_to }} />
          <div className="mt-auto space-y-1 pt-3">
            {form.show_support && form.support_label ? (
              <p className="text-[10px] text-gray-400">{form.support_text} <span className="font-semibold text-gray-800">{form.support_label}</span></p>
            ) : null}
            {form.copyright_text ? <p className="text-[9px] text-gray-400">{form.copyright_text}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const CONTACT_DEFAULTS = {
  contact_heading: "We're Here to",
  contact_highlight: 'Help',
  contact_intro: '',
  contact_phone: '',
  contact_email: '',
  contact_address: '',
  contact_hours: '',
};

const contactFromSettings = (settings = {}) => {
  const form = { ...CONTACT_DEFAULTS };
  Object.keys(CONTACT_DEFAULTS).forEach((key) => {
    if (settings[key] !== undefined && settings[key] !== null) form[key] = settings[key];
  });
  return form;
};

// Content of the public Contact Us page (/taxi/contact).
const ContactPanel = ({ settings, onSaved }) => {
  const [form, setForm] = useState(() => contactFromSettings(settings));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const saved = useMemo(() => contactFromSettings(settings), [settings]);
  const dirty = JSON.stringify(saved) !== JSON.stringify(form);
  const set = (key, value) => { setMessage(''); setForm((f) => ({ ...f, [key]: value })); };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = unwrap(await api.patch('/admin/login-banners/settings', form));
      onSaved(response);
      setMessage('Contact page saved.');
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const area = (key, label, rows = 3) => (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-500">{label}</label>
      <textarea rows={rows} value={form[key]} onChange={(e) => set(key, e.target.value)} className={inputClass} />
    </div>
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Contact page</h2>
          <p className="text-xs text-gray-400">Content of the public Contact Us page (/taxi/contact), also opened by the login screen support link.</p>
        </div>
        {dirty ? <span className="rounded bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600">UNSAVED</span> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextInput label="Heading" value={form.contact_heading} onChange={(v) => set('contact_heading', v)} />
        <TextInput label="Highlighted word (shown in yellow)" value={form.contact_highlight} onChange={(v) => set('contact_highlight', v)} />
        <div className="md:col-span-2">{area('contact_intro', 'Intro text', 2)}</div>
        <TextInput label="Support phone" value={form.contact_phone} onChange={(v) => set('contact_phone', v)} />
        <TextInput label="Support email" value={form.contact_email} onChange={(v) => set('contact_email', v)} />
        {area('contact_address', 'Headquarters address (each line shows on a new line)')}
        {area('contact_hours', 'Operating hours text')}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={saving || !dirty} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save contact page'}
        </button>
        <button type="button" onClick={() => { setMessage(''); setForm(saved); }} disabled={!dirty} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          Discard changes
        </button>
        {message ? <span className="text-xs text-gray-500">{message}</span> : null}
      </div>
    </div>
  );
};

export const LoginScreenDesign = () => {
  const [settings, setSettings] = useState(null);
  const [banners, setBanners] = useState([]);
  const [error, setError] = useState('');
  const [app, setApp] = useState('user');
  const [forms, setForms] = useState({ user: LOOK_DEFAULTS, partner: LOOK_DEFAULTS });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = unwrap(await api.get('/admin/login-banners'));
      const next = data?.settings || {};
      setSettings(next);
      setBanners(Array.isArray(data?.results) ? data.results : []);
      setForms({ user: formFromSettings(next, 'user'), partner: formFromSettings(next, 'partner') });
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Banner actions only refresh the banners, so unsaved design edits are never lost.
  const reloadBanners = useCallback(async () => {
    const data = unwrap(await api.get('/admin/login-banners'));
    setBanners(Array.isArray(data?.results) ? data.results : []);
    if (data?.settings) setSettings((prev) => ({ ...prev, user_enabled: data.settings.user_enabled, partner_enabled: data.settings.partner_enabled }));
  }, []);

  const run = async (fn) => {
    try {
      await fn();
      await reloadBanners();
    } catch (err) {
      window.alert(errorMessage(err));
    }
  };

  const group = banners.filter((b) => b.app === app);
  const bannersEnabled = settings ? settings[app === 'user' ? 'user_enabled' : 'partner_enabled'] !== false : true;

  const move = (banner, delta) =>
    run(async () => {
      const from = group.findIndex((b) => b._id === banner._id);
      const to = from + delta;
      if (to < 0 || to >= group.length) return;
      const ids = group.map((b) => b._id);
      [ids[from], ids[to]] = [ids[to], ids[from]];
      await api.post('/admin/login-banners/reorder', { ids });
    });

  const remove = (banner) => {
    if (!window.confirm('Delete this banner?')) return;
    run(() => api.delete(`/admin/login-banners/${banner._id}`));
  };

  const toggleEnabled = (value) =>
    run(async () => {
      await api.patch('/admin/login-banners/settings', { [app === 'user' ? 'user_enabled' : 'partner_enabled']: value });
    });

  const form = forms[app];
  const saved = useMemo(() => (settings ? formFromSettings(settings, app) : null), [settings, app]);
  const dirty = saved ? JSON.stringify(saved) !== JSON.stringify(form) : false;
  const set = (key, value) => { setMessage(''); setForms((f) => ({ ...f, [app]: { ...f[app], [key]: value } })); };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = unwrap(await api.patch('/admin/login-banners/settings', payloadFromForm(form, app)));
      setSettings(response);
      setMessage(`${APP_META[app].label} login screen saved.`);
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { if (saved) { setMessage(''); setForms((f) => ({ ...f, [app]: saved })); } };

  return (
    <div className="min-h-full bg-gray-50 text-gray-900">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Login Screen Design</h1>
          <p className="mt-1 text-sm text-gray-500">
            Design the login screen separately for the user app and the driver / owner app. Manage each app's banners & offers further down on this page.
          </p>
        </div>
        <div className="inline-flex shrink-0 rounded-full border border-gray-200 bg-white p-1">
          {Object.entries(APP_META).map(([id, meta]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setApp(id); setMessage(''); }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${app === id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="py-10 text-center text-sm text-red-500">{error}</p>
      ) : settings === null ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-600" /></div>
      ) : (
        <>
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="User app · banners created" value={banners.filter((b) => b.app === 'user').length} />
          <StatCard label="User app · active" value={banners.filter((b) => b.app === 'user' && b.active).length} color="text-emerald-600" />
          <StatCard label="Driver / owner · banners created" value={banners.filter((b) => b.app === 'partner').length} color="text-purple-600" />
          <StatCard label="Driver / owner · active" value={banners.filter((b) => b.app === 'partner' && b.active).length} color="text-emerald-600" />
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{APP_META[app].label} &middot; {APP_META[app].hint}</h2>
                <p className="text-xs text-gray-400">Changes here only affect this app.</p>
              </div>
              {dirty ? <span className="rounded bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600">UNSAVED</span> : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <ColorInput label="Header color (top)" value={form.header_from} onChange={(v) => set('header_from', v)} />
              <ColorInput label="Header color (bottom)" value={form.header_to} onChange={(v) => set('header_to', v)} />
              <ColorInput label="Accent color (chips, underline)" value={form.accent_color} onChange={(v) => set('accent_color', v)} />
              <div className="md:col-span-3">
                <TextInput label="Tagline" value={form.tagline} onChange={(v) => set('tagline', v)} />
              </div>
              <TextInput label="Support text" value={form.support_text} onChange={(v) => set('support_text', v)} placeholder="Need assistance?" />
              <TextInput label="Support link label" value={form.support_label} onChange={(v) => set('support_label', v)} placeholder="Contact Support" />
              <SupportLinkField value={form.support_link} onChange={(v) => set('support_link', v)} />
              <div className="md:col-span-3">
                <TextInput label="Copyright / rights text" value={form.copyright_text} onChange={(v) => set('copyright_text', v)} />
              </div>
              <div className="flex items-center gap-3 md:col-span-3">
                <Toggle checked={Boolean(form.show_support)} onChange={(v) => set('show_support', v)} />
                <span className="text-sm text-gray-600">Show the support link on this login screen</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={save} disabled={saving || !dirty} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving...' : `Save ${APP_META[app].label}`}
              </button>
              <button type="button" onClick={reset} disabled={!dirty} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                Discard changes
              </button>
              {message ? <span className="text-xs text-gray-500">{message}</span> : null}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{APP_META[app].label} banners &amp; offers ({group.length})</h2>
                <p className="text-xs text-gray-400">Shown above the login form. Edit, hide, reorder or delete them here.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Show banners</span>
                <Toggle checked={bannersEnabled} onChange={toggleEnabled} />
                <button
                  type="button"
                  onClick={() => setModal(emptyForm(app))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  <Plus size={14} /> Add Banner
                </button>
              </div>
            </div>

            {group.length === 0 ? (
              <div className="space-y-3 rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
                <p>No banners for this app yet.</p>
                {banners.length === 0 ? (
                  <button type="button" onClick={() => run(() => api.post('/admin/login-banners/seed'))} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                    <Sparkles size={13} /> Seed Recommended
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                {group.map((banner, idx) => (
                  <div key={banner._id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
                    <div className="min-w-0 flex-1"><BannerCard banner={banner} compact /></div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{banner.active ? 'Active' : 'Hidden'}</span>
                        <Toggle checked={banner.active} onChange={(v) => run(() => api.patch(`/admin/login-banners/${banner._id}`, { active: v }))} />
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <button type="button" disabled={idx === 0} onClick={() => move(banner, -1)} className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30"><ArrowUp size={14} /></button>
                        <button type="button" disabled={idx === group.length - 1} onClick={() => move(banner, 1)} className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30"><ArrowDown size={14} /></button>
                        <button type="button" onClick={() => setModal({ ...emptyForm(banner.app), ...banner })} className="rounded p-1.5 hover:bg-indigo-50 hover:text-indigo-600"><Pencil size={14} /></button>
                        <button type="button" onClick={() => remove(banner)} className="rounded p-1.5 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ContactPanel settings={settings} onSaved={setSettings} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Live preview &middot; {APP_META[app].label}</p>
            <PhonePreview form={form} app={app} banners={banners} enabled={settings[app === 'user' ? 'user_enabled' : 'partner_enabled'] !== false} />
          </div>
        </div>
        </>
      )}

      {modal ? (
        <BannerModal
          initial={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); run(async () => {}); }}
        />
      ) : null}
    </div>
  );
};

export default LoginBanners;
