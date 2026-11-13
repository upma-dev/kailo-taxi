import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Save, Trash2, Upload, ExternalLink, RefreshCw, Monitor, Smartphone, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import api from '../../../../shared/api/axiosInstance';
import { cmsApi, pageEndpoint } from '../../services/cmsService';
import { ICON_KEYS } from '../../../shared/pages/landingShared';
import { announceLandingUpdate } from '../../../../shared/hooks/useLandingContent';
import sceneCab from '@/assets/landing/scenes/cab.webp';
import sceneBike from '@/assets/landing/scenes/bike.webp';
import sceneBus from '@/assets/landing/scenes/bus.webp';
import sceneParcel from '@/assets/landing/scenes/parcel.webp';
import sceneTrip from '@/assets/landing/scenes/outstation.webp';
import sceneFlight from '@/assets/landing/scenes/flight.webp';
import sceneHotel from '@/assets/landing/scenes/hotel.webp';
import sceneMovers from '@/assets/landing/scenes/movers.webp';
import cityIllu from '@/assets/images/mobility-illustration.webp';
import mapImg from '@/assets/premium_grid_map.webp';

// The photos the website shows when no custom image is set, so they can be seen and opened from here.
const SCENES = { cab: sceneCab, bike: sceneBike, bus: sceneBus, parcel: sceneParcel, outstation: sceneTrip, flight: sceneFlight, hotel: sceneHotel, movers: sceneMovers };

const input =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none';
const label = 'block text-xs font-semibold text-gray-500 mb-1';
const card = 'bg-white rounded-xl border border-gray-200 p-5 space-y-4';

const getIn = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const setIn = (obj, path, value) => {
  const [head, ...rest] = path.split('.');
  const base = Array.isArray(obj) ? [...obj] : { ...obj };
  base[head] = rest.length ? setIn(obj?.[head] ?? {}, rest.join('.'), value) : value;
  return base;
};

function Field({ title, value, onChange, multiline, placeholder, hint }) {
  return (
    <div>
      <label className={label}>{title}</label>
      {multiline ? (
        <textarea className={`${input} min-h-[84px]`} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className={input} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

function ImageField({ title, value, onChange, hint, fallback }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5 MB');
    try {
      setBusy(true);
      const form = new FormData();
      form.append('image', file);
      const body = await api.post('/admin/landing/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange(body?.data?.url || '');
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <label className={label}>{title}</label>
      <div className="flex items-center gap-3">
        {value || fallback ? (
          <a href={value || fallback} target="_blank" rel="noreferrer" title="Open image" className="shrink-0">
            <img src={value || fallback} alt="" className={`h-14 w-14 rounded-lg border border-gray-200 bg-gray-50 object-cover ${value ? '' : 'opacity-80'}`} />
          </a>
        ) : (
          <div className="h-14 w-14 shrink-0 rounded-lg border border-dashed border-gray-300 bg-gray-50" />
        )}
        <input className={input} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="Paste image URL or upload" />
        <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-xs font-bold text-red-500">
            Clear
          </button>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} />
      </div>
      {(value || fallback) && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[11px] text-gray-500">
          <a href={value || fallback} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-teal-700 hover:underline">
            <ExternalLink size={12} /> Open image
          </a>
          {!value && <span>This is the built-in image the website is showing now. Upload one to replace it.</span>}
        </p>
      )}
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

// Edits an array of flat objects. fields: [{ key, label, multiline?, image? }]
function ListEditor({ title, items, onChange, fields, blank, addText = 'Add item' }) {
  const list = Array.isArray(items) ? items : [];
  const patch = (i, key, value) => onChange(list.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-800">{title}</span>
        <button type="button" onClick={() => onChange([...list, { ...blank }])} className="flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline">
          <Plus size={14} /> {addText}
        </button>
      </div>
      {list.map((it, i) => (
        <div key={i} className="relative space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
          <button type="button" onClick={() => onChange(list.filter((_, idx) => idx !== i))} className="absolute right-3 top-3 text-gray-400 hover:text-red-500" aria-label="Remove">
            <Trash2 size={15} />
          </button>
          <div className="grid gap-3 pr-6 sm:grid-cols-2">
            {fields.map((f) =>
              f.image ? (
                <div key={f.key} className="sm:col-span-2">
                  <ImageField title={f.label} value={it[f.key]} onChange={(v) => patch(i, f.key, v)} fallback={typeof f.fallback === 'function' ? f.fallback(it) : undefined} />
                </div>
              ) : f.icon ? (
                <div key={f.key}>
                  <label className={label}>{f.label}</label>
                  <select className={input} value={it[f.key] || ''} onChange={(e) => patch(i, f.key, e.target.value)}>
                    {ICON_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div key={f.key} className={f.multiline ? 'sm:col-span-2' : ''}>
                  <Field title={f.label} value={it[f.key]} multiline={f.multiline} onChange={(v) => patch(i, f.key, v)} />
                </div>
              ),
            )}
          </div>
        </div>
      ))}
      {list.length === 0 && <p className="text-xs text-gray-400">Nothing here yet.</p>}
    </div>
  );
}

const LINK_FIELDS = [
  { key: 'label', label: 'Label' },
  { key: 'target', label: 'Link (#section, /page or https://…)' },
];

function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const body = await api.get('/admin/landing/leads');
      setLeads(Array.isArray(body?.data) ? body.data : []);
    } catch {
      toast.error('Could not load registrations');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id, status) => {
    try {
      const body = await api.patch(`/admin/landing/leads/${id}`, { status });
      setLeads((l) => l.map((x) => (x._id === id ? body.data : x)));
    } catch {
      toast.error('Update failed');
    }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this registration?')) return;
    try {
      await api.delete(`/admin/landing/leads/${id}`);
      setLeads((l) => l.filter((x) => x._id !== id));
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">Website registrations ({leads.length})</h3>
        <button type="button" onClick={load} className="flex items-center gap-1 text-xs font-bold text-teal-700">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      {loading ? (
        <Loader2 className="animate-spin text-gray-400" />
      ) : leads.length === 0 ? (
        <p className="text-sm text-gray-400">No registrations yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-400">
              <tr>
                {['Name', 'Phone', 'Email', 'City', 'Type', 'Message', 'Date', 'Status', ''].map((h) => (
                  <th key={h} className="px-2 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l._id} className="border-t border-gray-100 align-top">
                  <td className="px-2 py-2 font-semibold">{l.name}</td>
                  <td className="px-2 py-2">{l.phone}</td>
                  <td className="px-2 py-2">{l.email || '-'}</td>
                  <td className="px-2 py-2">{l.city || '-'}</td>
                  <td className="px-2 py-2 capitalize">{l.role}</td>
                  <td className="max-w-[220px] px-2 py-2 text-gray-500">{l.message || '-'}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-gray-500">{new Date(l.createdAt).toLocaleDateString()}</td>
                  <td className="px-2 py-2">
                    <select value={l.status} onChange={(e) => setStatus(l._id, e.target.value)} className="rounded border border-gray-200 px-1.5 py-1 text-xs">
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => remove(l._id)} className="text-gray-400 hover:text-red-500" aria-label="Delete">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TABS = ['Theme', 'Header', 'Hero', 'About', 'Services', 'Rider section', 'Vision', 'How it works', 'Audiences', 'Founder', 'Store links & QR', 'FAQ', 'Contact', 'Footer', 'Messages', 'App login screens'];
const DEFAULT_THEME = { primary: '#0F766E', dark: '#052E2B', accent: '#C6F432', ink: '#14213D' };
const THEME_FIELDS = [
  ['primary', 'Main colour', 'Buttons, icons, links and the teal sections'],
  ['dark', 'Dark colour', 'Dark section backgrounds and the footer'],
  ['accent', 'Highlight colour', 'The bright colour used for highlights and badges'],
  ['ink', 'Text colour', 'Headings and body text on light sections'],
];
const ICON_FIELD = { key: 'icon', label: 'Icon', icon: true };
const Toggle = ({ checked, onChange, children }) => (
  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {children}
  </label>
);

// Which part of the page to bring into view in the preview for each tab.
const TAB_ANCHOR = {
  About: '#about',
  Services: '#services',
  'Rider section': '#rider',
  Vision: '#vision',
  'How it works': '#how-it-works',
  Audiences: '#audiences',
  Founder: '#founder',
  FAQ: '#faq',
  Contact: '#contact',
  Footer: '#footer',
  'Store links & QR': '#footer',
};
const TAB_FROM_QUERY = { 'app-screens': 'App login screens', theme: 'Theme', messages: 'Messages' };

// The real landing page in an iframe. Every keystroke is sent to it, so what you see is what visitors will get after Save.
function PreviewPane({ data, tab, onHide }) {
  const frameRef = useRef(null);
  const boxRef = useRef(null);
  const [device, setDevice] = useState('desktop');
  const [ready, setReady] = useState(0);
  const [box, setBox] = useState({ w: 560, h: 700 });

  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin === window.location.origin && e.data?.type === 'kailo-landing-ready') setReady((n) => n + 1);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const post = useCallback((msg) => frameRef.current?.contentWindow?.postMessage(msg, window.location.origin), []);

  useEffect(() => {
    const t = setTimeout(() => post({ type: 'kailo-landing-preview', data }), 150);
    return () => clearTimeout(t);
  }, [data, ready, device, post]);

  useEffect(() => {
    const t = setTimeout(() => post({ type: 'kailo-landing-scroll', selector: TAB_ANCHOR[tab] || null }), 500);
    return () => clearTimeout(t);
  }, [tab, ready, device, post]);

  const width = device === 'mobile' ? 390 : 1280;
  const scale = Math.min(1, box.w / width);
  const left = device === 'mobile' ? Math.max(0, (box.w - width * scale) / 2) : 0;

  return (
    <div className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live preview
        </div>
        <div className="flex items-center gap-1">
          {[
            ['desktop', Monitor],
            ['mobile', Smartphone],
          ].map(([id, Icon]) => (
            <button key={id} type="button" onClick={() => setDevice(id)} className={`rounded-lg p-1.5 ${device === id ? 'bg-teal-700 text-white' : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`} title={id}>
              <Icon size={14} />
            </button>
          ))}
          <button type="button" onClick={onHide} className="ml-1 rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50" title="Hide preview">
            <EyeOff size={14} />
          </button>
        </div>
      </div>
      <div ref={boxRef} className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm">
        <iframe
          ref={frameRef}
          title="Landing page preview"
          src="/landing?lp_preview=1"
          style={{ width, height: box.h / scale, transform: `scale(${scale})`, transformOrigin: 'top left', marginLeft: left, border: 0, background: '#fff' }}
        />
      </div>
      <p className="text-[11px] text-gray-400">Changes show here as you type. Press Save changes to publish them to the website.</p>
    </div>
  );
}

const CMSLanding = () => {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('tab');
      return TAB_FROM_QUERY[q] || TABS[0];
    } catch {
      return TABS[0];
    }
  });
  const [saving, setSaving] = useState(false);
  const [previewOn, setPreviewOn] = useState(true);
  const location = useLocation();

  // The sidebar links straight to a tab (?tab=app-screens), also when this page is already open.
  useEffect(() => {
    const t = TAB_FROM_QUERY[new URLSearchParams(location.search).get('tab')];
    if (t) setTab(t);
  }, [location.search]);

  useEffect(() => {
    cmsApi
      .get(pageEndpoint('landing'))
      .then((res) => setData(res.data?.data || {}))
      .catch(() => {
        toast.error('Could not load landing content');
        setData({});
      });
  }, []);

  const set = (path) => (value) => setData((d) => setIn(d, path, value));
  const f = (path, title, extra = {}) => <Field title={title} value={getIn(data, path)} onChange={set(path)} {...extra} />;
  const img = (path, title, hint, fallback) => <ImageField title={title} value={getIn(data, path)} onChange={set(path)} hint={hint} fallback={fallback} />;

  const save = async () => {
    try {
      setSaving(true);
      const res = await cmsApi.put(pageEndpoint('landing'), data);
      setData(res.data?.data || data);
      announceLandingUpdate();
      toast.success('Landing page saved. Changes are live.');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`mx-auto flex items-start gap-6 p-6 pb-24 lg:p-8 ${previewOn ? 'max-w-[1760px]' : 'max-w-5xl'}`}>
    <div className="min-w-0 flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Landing Page</h1>
          <p className="mt-1 text-xs text-gray-400">Everything on the public website and the app login screens is controlled here.</p>
        </div>
        <div className="flex items-center gap-2">
          {!previewOn && (
            <button type="button" onClick={() => setPreviewOn(true)} className="hidden items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-bold text-gray-600 hover:bg-gray-50 xl:flex">
              <Eye size={15} /> Live preview
            </button>
          )}
          <a href="/landing" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-bold text-gray-600 hover:bg-gray-50">
            <ExternalLink size={15} /> View site
          </a>
          {tab !== 'Messages' && (
            <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2 text-[13px] font-bold text-white hover:bg-teal-800 disabled:opacity-60">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save changes
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${tab === t ? 'bg-teal-700 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Theme' && (
        <div className={card}>
          <p className="text-xs text-gray-500">
            Pick the four brand colours. Every shade on the landing page (light backgrounds, gradients, cards) is worked out from these, so the page always stays consistent.
            The hero slide colours (orange for bikes, pink for hotels and so on) are separate and stay as they are.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {THEME_FIELDS.map(([k, title, hint]) => (
              <div key={k}>
                <label className={label}>{title}</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={/^#[0-9a-f]{6}$/i.test(data.theme?.[k] || '') ? data.theme[k] : DEFAULT_THEME[k]} onChange={(e) => set(`theme.${k}`)(e.target.value.toUpperCase())} className="h-10 w-14 cursor-pointer rounded border border-gray-200 bg-white p-1" />
                  <input className={input} value={data.theme?.[k] ?? ''} onChange={(e) => set(`theme.${k}`)(e.target.value)} placeholder={DEFAULT_THEME[k]} />
                </div>
                <p className="mt-1 text-[11px] text-gray-400">{hint}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex overflow-hidden rounded-lg border border-gray-200">
              {THEME_FIELDS.map(([k]) => (
                <span key={k} className="h-9 w-14" style={{ background: /^#[0-9a-f]{6}$/i.test(data.theme?.[k] || '') ? data.theme[k] : DEFAULT_THEME[k] }} />
              ))}
            </div>
            <button type="button" onClick={() => set('theme')({ ...DEFAULT_THEME })} className="text-xs font-bold text-teal-700 hover:underline">
              Reset to Kailo colours
            </button>
          </div>
          <p className="text-[11px] text-gray-400">Use a hex code like #0F766E. Save changes and refresh the website to see it.</p>
        </div>
      )}

      {tab === 'Header' && (
        <div className={card}>
          <div className="grid gap-4 sm:grid-cols-2">
            {f('header.brandName', 'Brand name')}
            {img('header.logo', 'Logo', 'Leave empty to use the default logo. A logo set in App Customization > Branding wins over this one.', '/kailo-taxi-logo.png')}
            {f('header.earnText', '"Earn with us" link text', { hint: 'Leave empty to hide it' })}
            {f('header.earnTarget', '"Earn with us" link target')}
            {f('header.ctaText', 'Get-the-app button text')}
            {f('header.storeSubtitle', 'Store dropdown subtitle', { hint: 'Small text under Google Play / App Store' })}
          </div>
          <p className="text-xs text-gray-500">The Google Play / App Store dropdown uses the links from the Store links &amp; QR tab.</p>
          <ListEditor title="Menu links" items={data.header?.links} onChange={set('header.links')} fields={LINK_FIELDS} blank={{ label: '', target: '' }} addText="Add link" />
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <Toggle checked={data.header?.languageEnabled !== false} onChange={set('header.languageEnabled')}>
              Show language switcher
            </Toggle>
            <Toggle checked={data.header?.showAllLanguages !== false} onChange={set('header.showAllLanguages')}>
              Offer every language Google Translate supports (about 130, with search)
            </Toggle>
            <p className="text-[11px] text-gray-400">Visitors pick a language and the whole page, including text you edit here, is translated automatically. The list below is shown first as "Popular" (or is the only list if the option above is off). Code is a Google Translate code (en, hi, kn, ta, te, mr, bn, gu, pa, ml, ur…).</p>
            <ListEditor
              title="Languages"
              items={data.header?.languages}
              onChange={set('header.languages')}
              fields={[{ key: 'code', label: 'Code (e.g. hi)' }, { key: 'label', label: 'Name shown (e.g. हिन्दी)' }]}
              blank={{ code: '', label: '', enabled: true }}
              addText="Add language"
            />
            <p className="text-[11px] text-gray-400">To hide a language, remove it from this list. English (en) should stay first.</p>
          </div>
        </div>
      )}

      {tab === 'Hero' && (
        <div className={card}>
          <p className="text-xs text-gray-500">
            The hero shows one slide per vehicle tab. Text and vehicle image change together. Key picks the default vehicle image: cab, bike, bus, parcel or outstation.
          </p>
          {img('hero.background', 'Default background photo', 'Night city photo behind the hero. Empty uses the built-in one. A slide can override it.', sceneCab)}
          <ListEditor
            title="Slides (vehicle tabs)"
            items={data.hero?.slides}
            onChange={set('hero.slides')}
            fields={[
              { key: 'key', label: 'Key (cab / bike / bus / parcel / outstation / flight / hotel / movers)' },
              { key: 'tab', label: 'Tab name' },
              { key: 'badge', label: 'Small badge text' },
              { key: 'title', label: 'Headline (line 1)' },
              { key: 'highlight', label: 'Headline (highlighted line)' },
              { key: 'subtitle', label: 'Subtitle', multiline: true },
              { key: 'ctaText', label: 'Button text' },
              { key: 'ctaTarget', label: 'Button link' },
              { key: 'image', label: 'Image 1 (optional)', image: true },
              { key: 'image2', label: 'Image 2 (optional, shown beside image 1)', image: true },
              { key: 'video', label: 'Video URL (optional, .mp4 plays muted in a loop instead of images)' },
              { key: 'background', label: 'Background photo (optional)', image: true, fallback: (it) => SCENES[it.key] },
            ]}
            blank={{ key: 'cab', tab: '', badge: '', title: '', highlight: '', subtitle: '', ctaText: '', ctaTarget: '/taxi/user', image: '', image2: '', video: '', background: '' }}
            addText="Add slide"
          />
        </div>
      )}

      {tab === 'About' && (
        <div className={card}>
          {f('about.eyebrow', 'Small label (e.g. WHO WE ARE)')}
          {f('about.title', 'Title')}
          {f('about.description', 'Description', { multiline: true })}
          {img('about.image', 'Image (optional)', 'Shown under the description')}
          <ListEditor title="Feature cards" items={data.about?.cards} onChange={set('about.cards')} fields={[ICON_FIELD, { key: 'title', label: 'Title' }, { key: 'description', label: 'Description', multiline: true }]} blank={{ icon: 'shield', title: '', description: '' }} addText="Add card" />
        </div>
      )}

      {tab === 'Services' && (
        <div className={card}>
          <Toggle checked={data.services?.enabled !== false} onChange={set('services.enabled')}>
            Show Services section
          </Toggle>
          {f('services.eyebrow', 'Small label')}
          {f('services.title', 'Title')}
          {f('services.subtitle', 'Subtitle', { multiline: true })}
          <ListEditor title="Services" items={data.services?.items} onChange={set('services.items')} fields={[ICON_FIELD, { key: 'title', label: 'Title' }, { key: 'description', label: 'Description', multiline: true }]} blank={{ icon: 'car', title: '', description: '' }} addText="Add service" />
        </div>
      )}

      {tab === 'Rider section' && (
        <div className={card}>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={data.rider?.enabled !== false} onChange={(e) => set('rider.enabled')(e.target.checked)} /> Show this 3D rider section
          </label>
          {f('rider.eyebrow', 'Small label')}
          <div className="grid gap-4 sm:grid-cols-2">
            {f('rider.title', 'Headline (line 1)')}
            {f('rider.highlight', 'Headline (highlighted)')}
          </div>
          {f('rider.description', 'Description', { multiline: true })}
          <Field title="Bullet points" value={(data.rider?.bullets || []).join(', ')} onChange={(v) => set('rider.bullets')(v.split(',').map((x) => x.trim()).filter(Boolean))} hint="Comma separated" />
          <div className="grid gap-4 sm:grid-cols-2">
            {f('rider.ctaText', 'Button text')}
            {f('rider.ctaTarget', 'Button link')}
          </div>
          {img('rider.image', 'Center image (car)', 'Transparent PNG works best. Empty uses the built-in illustration.', cityIllu)}
          {img('rider.background', 'Background image', 'City map or photo shown on the tilted 3D floor. Empty uses the built-in map.', mapImg)}
        </div>
      )}

      {tab === 'Vision' && (
        <div className={card}>
          {f('vision.eyebrow', 'Small label (default: Vision & mission)')}
          {f('vision.title', 'Title')}
          {f('vision.description', 'Vision', { multiline: true })}
          {f('vision.mission', 'Mission statement')}
          <ListEditor title="Values" items={data.vision?.values} onChange={set('vision.values')} fields={[{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description', multiline: true }]} blank={{ title: '', description: '' }} />
        </div>
      )}

      {tab === 'How it works' && (
        <div className={card}>
          <Toggle checked={data.howItWorks?.enabled !== false} onChange={set('howItWorks.enabled')}>
            Show How it works section
          </Toggle>
          <div className="grid gap-4 sm:grid-cols-2">
            {f('howItWorks.eyebrow', 'Small label')}
            {f('howItWorks.title', 'Title')}
            {f('howItWorks.stepLabel', 'Step word (e.g. Step)')}
          </div>
          <p className="text-[11px] text-gray-400">Each tab is a user type (Riders, Drivers, Owners, Fleet). Add, rename or remove tabs and edit the steps in each.</p>
          {(data.howItWorks?.tabs || []).map((t, i) => (
            <div key={i} className="relative space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
              <button type="button" onClick={() => set('howItWorks.tabs')(data.howItWorks.tabs.filter((_, idx) => idx !== i))} className="absolute right-3 top-3 text-gray-400 hover:text-red-500" aria-label="Remove tab">
                <Trash2 size={15} />
              </button>
              <div className="pr-6">{f(`howItWorks.tabs.${i}.label`, 'Tab name')}</div>
              <ListEditor title="Steps" items={t.steps} onChange={set(`howItWorks.tabs.${i}.steps`)} fields={[{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description', multiline: true }]} blank={{ title: '', description: '' }} addText="Add step" />
            </div>
          ))}
          <button type="button" onClick={() => set('howItWorks.tabs')([...(data.howItWorks?.tabs || []), { label: '', steps: [] }])} className="flex items-center gap-1 text-xs font-bold text-teal-700">
            <Plus size={14} /> Add tab
          </button>
        </div>
      )}

      {tab === 'Founder' && (
        <div className={card}>
          <Toggle checked={data.founder?.enabled !== false} onChange={set('founder.enabled')}>
            Show Founder &amp; Journey section
          </Toggle>
          <div className="grid gap-4 sm:grid-cols-2">
            {f('founder.eyebrow', 'Small label')}
            {f('founder.title', 'Title')}
          </div>
          {f('founder.subtitle', 'Subtitle')}
          <ListEditor
            title="Founders / Directors"
            items={data.founder?.people}
            onChange={set('founder.people')}
            fields={[
              { key: 'name', label: 'Name' },
              { key: 'role', label: 'Role (e.g. Founder & Director)' },
              { key: 'bio', label: 'Profile / background', multiline: true },
              { key: 'quote', label: 'Quote (optional)', multiline: true },
              { key: 'photo', label: 'Photo', image: true },
            ]}
            blank={{ name: '', role: '', bio: '', quote: '', photo: '' }}
            addText="Add person"
          />
          {f('founder.journeyTitle', 'Journey title')}
          <ListEditor
            title="Journey milestones"
            items={data.founder?.journey}
            onChange={set('founder.journey')}
            fields={[{ key: 'year', label: 'Year / phase' }, { key: 'title', label: 'Title' }, { key: 'description', label: 'Description', multiline: true }]}
            blank={{ year: '', title: '', description: '' }}
            addText="Add milestone"
          />
        </div>
      )}

      {tab === 'Contact' && (
        <div className={card}>
          <Toggle checked={data.contact?.enabled !== false} onChange={set('contact.enabled')}>
            Show Contact section
          </Toggle>
          <div className="grid gap-4 sm:grid-cols-2">
            {f('contact.eyebrow', 'Small label')}
            {f('contact.title', 'Title')}
          </div>
          {f('contact.subtitle', 'Subtitle', { multiline: true })}
          <p className="text-[11px] text-gray-400">Cards with an empty value are hidden. Helpline and email fall back to the Footer values.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {f('contact.helplineLabel', 'Helpline card title')}
            {f('contact.helpline', 'Helpline number')}
            {f('contact.emailLabel', 'Email card title')}
            {f('contact.email', 'Email')}
            {f('contact.whatsappLabel', 'WhatsApp card title')}
            {f('contact.whatsapp', 'WhatsApp number', { hint: 'With country code, e.g. 919876543210' })}
            {f('contact.whatsappText', 'WhatsApp link text')}
            {f('contact.hoursLabel', 'Hours card title')}
            {f('contact.hours', 'Hours')}
            {f('contact.addressLabel', 'Office card title')}
            {f('contact.address', 'Office address')}
          </div>
          <ListEditor title="Extra info cards" items={data.contact?.extraCards} onChange={set('contact.extraCards')} fields={[ICON_FIELD, { key: 'title', label: 'Title' }, { key: 'text', label: 'Text', multiline: true }]} blank={{ icon: 'headset', title: '', text: '' }} addText="Add card" />
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <span className="text-sm font-bold text-gray-800">Message form</span>
            <div className="grid gap-4 sm:grid-cols-2">
              {f('contact.formTitle', 'Form title')}
              {f('contact.formSubtitle', 'Form subtitle')}
              {f('contact.nameLabel', 'Name label')}
              {f('contact.contactLabel', 'Phone / email label')}
              {f('contact.topicLabel', 'Topic label')}
              {f('contact.messageLabel', 'Message label')}
              {f('contact.buttonText', 'Button text')}
            </div>
            <Field title="Topic choices" value={(data.contact?.topics || []).join(', ')} onChange={(v) => set('contact.topics')(v.split(',').map((x) => x.trim()).filter(Boolean))} hint="Comma separated. Leave empty to hide the topic dropdown." />
            {f('contact.successMessage', 'Success message', { multiline: true })}
            <p className="text-[11px] text-gray-400">Messages sent from the website appear in the Messages tab.</p>
          </div>
        </div>
      )}

      {tab === 'Audiences' && (
        <div className={card}>
          <div className="grid gap-4 sm:grid-cols-2">
            {f('audiences.eyebrow', 'Small label (default: Partner with us)')}
            {f('audiences.title', 'Section title')}
            {f('audiences.subtitle', 'Subtitle')}
          </div>
          <p className="text-[11px] text-gray-400">Key decides the icon: user, driver or owner. Bullets are comma separated.</p>
          <div className="space-y-3">
            {(data.audiences?.items || []).map((it, i) => (
              <div key={i} className="relative space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                <button type="button" onClick={() => set('audiences.items')((data.audiences.items || []).filter((_, idx) => idx !== i))} className="absolute right-3 top-3 text-gray-400 hover:text-red-500">
                  <Trash2 size={15} />
                </button>
                <div className="grid gap-3 pr-6 sm:grid-cols-2">
                  {f(`audiences.items.${i}.key`, 'Key (user / driver / owner)')}
                  {f(`audiences.items.${i}.name`, 'Name')}
                  <div className="sm:col-span-2">{f(`audiences.items.${i}.description`, 'Description', { multiline: true })}</div>
                  <div className="sm:col-span-2">
                    <Field title="Bullets" value={(it.bullets || []).join(', ')} onChange={(v) => set(`audiences.items.${i}.bullets`)(v.split(',').map((s) => s.trim()).filter(Boolean))} />
                  </div>
                  <div className="sm:col-span-2">{f(`audiences.items.${i}.appStoreUrl`, 'App Store link for this card', { placeholder: 'Empty uses the main App Store link; if that is empty too, the card shows Coming soon' })}</div>
                  <div className="sm:col-span-2">{f(`audiences.items.${i}.playStoreUrl`, 'Google Play link for this card', { placeholder: 'Empty uses the main Play Store link; if that is empty too, the card shows Coming soon' })}</div>
                  {f(`audiences.items.${i}.ctaText`, 'Button text')}
                  {f(`audiences.items.${i}.ctaTarget`, 'Button link')}
                  <div className="sm:col-span-2">{img(`audiences.items.${i}.image`, 'Card image (optional)')}</div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => set('audiences.items')([...(data.audiences?.items || []), { key: 'user', name: '', description: '', bullets: [], ctaText: '', ctaTarget: '', image: '' }])} className="flex items-center gap-1 text-xs font-bold text-teal-700">
            <Plus size={14} /> Add card
          </button>
        </div>
      )}

      {tab === 'Store links & QR' && (
        <div className={card}>
          <p className="text-xs text-gray-500">Store buttons appear in the hero. The QR code appears in the footer.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {f('download.playStoreUrl', 'Google Play URL', { placeholder: 'https://play.google.com/store/apps/details?id=…' })}
            {f('download.appStoreUrl', 'App Store (iOS) URL', { placeholder: 'https://apps.apple.com/app/…' })}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={data.download?.showQr !== false} onChange={(e) => set('download.showQr')(e.target.checked)} /> Show QR code
          </label>
          {f('download.qrLabel', 'Text next to the QR code (default: Scan to get the app)')}
          {f('download.qrUrl', 'QR code target URL', { hint: 'The QR is generated from this link. Empty uses the Play Store, then App Store link.' })}
          {img('download.qrImage', 'Custom QR image (optional)', 'Upload your own QR to override the generated one.')}
        </div>
      )}

      {tab === 'Registration' && (
        <div className={card}>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={data.register?.enabled !== false} onChange={(e) => set('register.enabled')(e.target.checked)} /> Show registration form
          </label>
          {f('register.title', 'Title')}
          {f('register.subtitle', 'Subtitle')}
          {f('register.successMessage', 'Success message', { multiline: true })}
          <ListEditor title="Who is registering (choices)" items={data.register?.roles} onChange={set('register.roles')} fields={[{ key: 'value', label: 'Value (saved)' }, { key: 'label', label: 'Label (shown)' }]} blank={{ value: '', label: '' }} addText="Add choice" />
          <p className="text-[11px] text-gray-400">Submissions appear in the Leads tab.</p>
        </div>
      )}

      {tab === 'FAQ' && (
        <div className={card}>
          {f('faq.eyebrow', 'Small label (default: FAQ)')}
          {f('faq.title', 'Title')}
          <ListEditor title="Questions" items={data.faq?.items} onChange={set('faq.items')} fields={[{ key: 'question', label: 'Question' }, { key: 'answer', label: 'Answer', multiline: true }]} blank={{ question: '', answer: '' }} addText="Add question" />
        </div>
      )}

      {tab === 'Footer' && (
        <div className={card}>
          {f('footer.companyName', 'Company name', { hint: 'Used in the copyright line' })}
          {f('footer.about', 'About text', { multiline: true })}
          <Toggle checked={data.footer?.showStoreBadges !== false} onChange={set('footer.showStoreBadges')}>
            Show Google Play / App Store badges
          </Toggle>
          <div className="grid gap-4 sm:grid-cols-2">
            {f('footer.locationTitle', 'Location column title')}
            {f('footer.helplineLabel', 'Helpline label')}
            {f('footer.email', 'Email')}
            {f('footer.phone', 'Helpline phone')}
          </div>
          {f('footer.address', 'Address')}
          {f('footer.copyright', 'Copyright line', { hint: 'Use {year} and {company} as placeholders' })}
          <div className="grid gap-4 sm:grid-cols-2">
            {f('footer.builtIn', 'Bottom line, left part (e.g. Built in Bangalore, IN)')}
            {f('footer.tagline', 'Bottom line, tagline')}
          </div>
          {(data.footer?.columns || []).map((c, i) => (
            <div key={i} className="relative space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
              <button type="button" onClick={() => set('footer.columns')(data.footer.columns.filter((_, idx) => idx !== i))} className="absolute right-3 top-3 text-gray-400 hover:text-red-500">
                <Trash2 size={15} />
              </button>
              <div className="pr-6">{f(`footer.columns.${i}.title`, 'Column title')}</div>
              <ListEditor title="Links" items={c.links} onChange={set(`footer.columns.${i}.links`)} fields={LINK_FIELDS} blank={{ label: '', target: '' }} addText="Add link" />
            </div>
          ))}
          <button type="button" onClick={() => set('footer.columns')([...(data.footer?.columns || []), { title: '', links: [] }])} className="flex items-center gap-1 text-xs font-bold text-teal-700">
            <Plus size={14} /> Add column
          </button>
          <ListEditor title="Social links" items={data.footer?.social} onChange={set('footer.social')} fields={[{ key: 'label', label: 'Name (e.g. Instagram)' }, { key: 'url', label: 'URL' }]} blank={{ label: '', url: '' }} addText="Add social link" />
        </div>
      )}

      {tab === 'App login screens' && (
        <div className="space-y-5">
          <p className="text-xs text-gray-500">Text and image shown beside the login form in the Rider, Driver and Admin apps.</p>
          {[
            ['user', 'Rider app'],
            ['driver', 'Driver / owner app'],
            ['admin', 'Admin panel'],
          ].map(([k, name]) => (
            <div key={k} className={card}>
              <h3 className="text-sm font-bold text-gray-800">{name}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {f(`appScreens.${k}.title`, 'Headline (line 1)')}
                {f(`appScreens.${k}.highlight`, 'Headline (highlighted)')}
              </div>
              {f(`appScreens.${k}.subtitle`, 'Subtitle', { multiline: true })}
              {img(`appScreens.${k}.image`, 'Side image (optional)')}
            </div>
          ))}
        </div>
      )}

      {tab === 'Messages' && <Leads />}

      <p className="text-xs text-gray-400">
        Banners are managed under Promotions &gt; Banner Image, and push notifications under Promotions &gt; Send Notification.
      </p>
    </div>
    {previewOn && (
      <aside className="hidden w-[44%] max-w-[720px] shrink-0 xl:block">
        <PreviewPane data={data} tab={tab} onHide={() => setPreviewOn(false)} />
      </aside>
    )}
    </div>
  );
};

export default CMSLanding;
