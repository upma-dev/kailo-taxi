import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Save, Trash2, Upload, ExternalLink, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../shared/api/axiosInstance';
import { cmsApi, pageEndpoint } from '../../services/cmsService';

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

function ImageField({ title, value, onChange, hint }) {
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
        {value ? <img src={value} alt="" className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-50 object-contain" /> : <div className="h-14 w-14 rounded-lg border border-dashed border-gray-300 bg-gray-50" />}
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
                  <ImageField title={f.label} value={it[f.key]} onChange={(v) => patch(i, f.key, v)} />
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

const TABS = ['Header', 'Hero', 'About', 'Rider section', 'Vision', 'Audiences', 'Store links & QR', 'FAQ', 'Footer', 'App login screens'];

const CMSLanding = () => {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(TABS[0]);
  const [saving, setSaving] = useState(false);

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
  const img = (path, title, hint) => <ImageField title={title} value={getIn(data, path)} onChange={set(path)} hint={hint} />;

  const save = async () => {
    try {
      setSaving(true);
      const res = await cmsApi.put(pageEndpoint('landing'), data);
      setData(res.data?.data || data);
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
    <div className="mx-auto max-w-5xl space-y-6 p-6 pb-24 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Landing Page</h1>
          <p className="mt-1 text-xs text-gray-400">Everything on the public website and the app login screens is controlled here.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-bold text-gray-600 hover:bg-gray-50">
            <ExternalLink size={15} /> View site
          </a>
          {tab !== 'Leads' && (
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

      {tab === 'Header' && (
        <div className={card}>
          <div className="grid gap-4 sm:grid-cols-2">
            {f('header.brandName', 'Brand name')}
            {img('header.logo', 'Logo', 'Leave empty to use the default logo')}
            <p className="text-xs text-gray-500 sm:col-span-2">Google Play and App Store badges in the header use the links from the Store links &amp; QR tab.</p>
          </div>
          <ListEditor title="Menu links" items={data.header?.links} onChange={set('header.links')} fields={LINK_FIELDS} blank={{ label: '', target: '' }} addText="Add link" />
        </div>
      )}

      {tab === 'Hero' && (
        <div className={card}>
          <p className="text-xs text-gray-500">
            The hero shows one slide per vehicle tab. Text and vehicle image change together. Key picks the default vehicle image: cab, bike, bus, parcel or outstation.
          </p>
          {img('hero.background', 'Default background photo', 'Night city photo behind the hero. Empty uses the built-in one. A slide can override it.')}
          <ListEditor
            title="Slides (vehicle tabs)"
            items={data.hero?.slides}
            onChange={set('hero.slides')}
            fields={[
              { key: 'key', label: 'Key (cab / bike / bus / parcel / outstation)' },
              { key: 'tab', label: 'Tab name' },
              { key: 'badge', label: 'Small badge text' },
              { key: 'title', label: 'Headline (line 1)' },
              { key: 'highlight', label: 'Headline (highlighted line)' },
              { key: 'subtitle', label: 'Subtitle', multiline: true },
              { key: 'ctaText', label: 'Button text' },
              { key: 'ctaTarget', label: 'Button link' },
              { key: 'image', label: 'Vehicle image (optional)', image: true },
              { key: 'background', label: 'Background photo (optional)', image: true },
            ]}
            blank={{ key: 'cab', tab: '', badge: '', title: '', highlight: '', subtitle: '', ctaText: '', ctaTarget: '/taxi/user', image: '', background: '' }}
            addText="Add slide"
          />
        </div>
      )}

      {tab === 'About' && (
        <div className={card}>
          {f('about.title', 'Title')}
          {f('about.description', 'Description', { multiline: true })}
          {img('about.image', 'Image')}
          <ListEditor title="Highlights" items={data.about?.points} onChange={set('about.points')} fields={[{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description', multiline: true }]} blank={{ title: '', description: '' }} />
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
          {img('rider.image', 'Center image (car)', 'Transparent PNG works best. Empty uses the default taxi.')}
          {img('rider.background', 'Background image', 'City map or photo shown on the tilted 3D floor. Empty uses the default map.')}
          <ListEditor title="Floating cards (up to 3)" items={data.rider?.floatCards} onChange={set('rider.floatCards')} fields={[{ key: 'label', label: 'Label' }, { key: 'value', label: 'Value' }]} blank={{ label: '', value: '' }} addText="Add card" />
        </div>
      )}

      {tab === 'Vision' && (
        <div className={card}>
          {f('vision.title', 'Title')}
          {f('vision.description', 'Vision', { multiline: true })}
          {f('vision.mission', 'Mission statement')}
          <ListEditor title="Values" items={data.vision?.values} onChange={set('vision.values')} fields={[{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description', multiline: true }]} blank={{ title: '', description: '' }} />
        </div>
      )}

      {tab === 'Audiences' && (
        <div className={card}>
          <div className="grid gap-4 sm:grid-cols-2">
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
          {f('faq.title', 'Title')}
          <ListEditor title="Questions" items={data.faq?.items} onChange={set('faq.items')} fields={[{ key: 'question', label: 'Question' }, { key: 'answer', label: 'Answer', multiline: true }]} blank={{ question: '', answer: '' }} addText="Add question" />
        </div>
      )}

      {tab === 'Footer' && (
        <div className={card}>
          {f('footer.about', 'About text', { multiline: true })}
          <div className="grid gap-4 sm:grid-cols-2">
            {f('footer.email', 'Email')}
            {f('footer.phone', 'Phone')}
          </div>
          {f('footer.address', 'Address')}
          {f('footer.copyright', 'Copyright line')}
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

      {tab === 'Leads' && <Leads />}

      <p className="text-xs text-gray-400">
        Banners are managed under Promotions &gt; Banner Image, and push notifications under Promotions &gt; Send Notification.
      </p>
    </div>
  );
};

export default CMSLanding;
