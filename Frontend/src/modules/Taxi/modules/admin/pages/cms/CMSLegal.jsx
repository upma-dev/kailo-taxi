import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, Edit3, FilePlus2, Loader2, Plus, Save, ShieldCheck, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { cmsApi as api, pageEndpoint } from '../../services/cmsService';
import { legalHtmlToPlainText, plainTextToLegalHtml } from '@/shared/utils/legalContentFormat';

// Same lists the server starts with. The server adds anything the admin creates.
const BUILT_IN_APPS = ['user', 'driver', 'website'];
const BUILT_IN_DOCS = ['privacy', 'terms', 'refund', 'cancellation', 'shipping', 'dmv-compliance'];
const FALLBACK_INDEX = {
  apps: [
    { id: 'user', label: 'Rider App' },
    { id: 'driver', label: 'Driver App' },
    { id: 'website', label: 'Website' },
  ],
  docs: [
    { id: 'privacy', label: 'Privacy Policy' },
    { id: 'terms', label: 'Terms & Conditions' },
    { id: 'refund', label: 'Refund Policy' },
    { id: 'cancellation', label: 'Cancellation Policy' },
    { id: 'shipping', label: 'Parcel & Shipping Policy' },
    { id: 'dmv-compliance', label: 'DMV & Transport Compliance' },
  ],
};

// Rider app pages keep their original keys (terms, privacy, ...); every other app is "<app>-<document>".
const pageKey = (app, doc) => (app === 'user' ? doc : `${app}-${doc}`);

const slug = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const blankSection = () => ({ heading: '', body: '' });
const TEMPLATE_SECTIONS = (label) => [
  { heading: 'Overview', body: `Write what this ${label.toLowerCase()} covers.` },
  { heading: 'Details', body: '- **First point:** explain it here.\n- **Second point:** explain it here.' },
  { heading: 'Contact', body: 'For any questions, contact our support team.' },
];

// Section numbers are added automatically on the page, so headings are stored without them.
const stripNumber = (t) => String(t || '').replace(/^\s*\d+\s*[.):-]\s*/, '').trim();

// Splits saved HTML into { intro, sections: [{ heading, body }] } the same way the public page does.
const htmlToSections = (html) => {
  if (!html) return { intro: '', sections: [] };
  const root = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html').body.firstElementChild;
  const nodes = Array.from(root.childNodes);
  const h2 = nodes.filter((n) => n.nodeName === 'H2').length;
  const h3 = nodes.filter((n) => n.nodeName === 'H3').length;
  const tag = h2 === 1 && h3 > 0 ? 'H3' : 'H2';
  const preface = [];
  const sections = [];
  let cur = null;
  for (const n of nodes) {
    if (n.nodeName === tag) {
      cur = { heading: stripNumber(n.textContent), html: '' };
      sections.push(cur);
    } else if (!cur && /^H[1-3]$/.test(n.nodeName)) continue;
    else if (cur) cur.html += n.nodeType === 1 ? n.outerHTML : n.textContent;
    else if (n.textContent.trim()) preface.push(n.textContent.trim());
  }
  return {
    intro: preface.join(' '),
    sections: sections.map((x) => ({ heading: x.heading, body: legalHtmlToPlainText(x.html) })),
  };
};

const escapeText = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sectionsToHtml = (sections) =>
  sections
    .filter((x) => !x.hidden && (x.heading.trim() || x.body.trim()))
    .map((x) => `<h2>${escapeText(x.heading.trim() || 'Section')}</h2>${plainTextToLegalHtml(x.body)}`)
    .join('');

const SwitchCard = ({ title, hint, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3">
    <div>
      <p className="text-sm font-bold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500">{hint}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  </div>
);

const CMSLegal = () => {
  const [index, setIndex] = useState(FALLBACK_INDEX);
  const [app, setApp] = useState('user');
  const [doc, setDoc] = useState('privacy');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('edit');
  const [form, setForm] = useState({ title: '', intro: '', sections: [], published: true, showUpdated: true, updatedAt: '' });
  const [status, setStatus] = useState({}); // app id -> 'live' | 'draft'

  const [adding, setAdding] = useState(null); // 'app' | 'doc' | null
  const [newLabel, setNewLabel] = useState('');

  const key = pageKey(app, doc);
  const appLabel = index.apps.find((a) => a.id === app)?.label || app;
  const docLabel = index.docs.find((d) => d.id === doc)?.label || doc;
  // Cancellation charges (and the driver refund page) are built from the pricing settings, not from this text.
  const isLiveSettingsPage = doc === 'cancellation' || (doc === 'refund' && app === 'driver');

  useEffect(() => {
    api
      .get(pageEndpoint('legal-index'))
      .then((res) => res.data?.data && setIndex(res.data.data))
      .catch(() => {});
  }, []);

  // Live / Draft badge on every app for the document being edited.
  useEffect(() => {
    let alive = true;
    Promise.all(
      index.apps.map((a) =>
        api
          .get(pageEndpoint(pageKey(a.id, doc)))
          .then((res) => [a.id, res.data?.data?.published !== false && res.data?.data?.content ? 'live' : 'draft'])
          .catch(() => [a.id, 'draft']),
      ),
    ).then((rows) => alive && setStatus(Object.fromEntries(rows)));
    return () => {
      alive = false;
    };
  }, [index.apps, doc]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(pageEndpoint(key));
      const data = res.data?.data || {};
      const parsed = htmlToSections(data.content);
      setForm({
        title: data.title || docLabel,
        intro: data.intro || parsed.intro,
        published: data.published !== false,
        showUpdated: data.showUpdated !== false,
        updatedAt: data.updatedAt || '',
        sections: Array.isArray(data.sections) && data.sections.length
          ? data.sections.map((x) => ({ heading: x.heading || '', body: x.body || '', hidden: !!x.hidden }))
          : parsed.sections.length
          ? parsed.sections
          : data.content
            ? [{ heading: data.title || docLabel, body: legalHtmlToPlainText(data.content) }]
            : TEMPLATE_SECTIONS(docLabel),
      });
    } catch {
      setForm({ title: docLabel, intro: '', sections: TEMPLATE_SECTIONS(docLabel), published: true, showUpdated: true, updatedAt: '' });
    } finally {
      setLoading(false);
    }
  }, [key, docLabel]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Please enter a title');
    try {
      setSaving(true);
      await api.put(pageEndpoint(key), {
        title: form.title.trim(),
        intro: form.intro.trim(),
        content: sectionsToHtml(form.sections),
        published: form.published,
        showUpdated: form.showUpdated,
        sections: form.sections,
      });
      setForm((f) => ({ ...f, updatedAt: new Date().toISOString() }));
      setStatus((st) => ({ ...st, [app]: form.published ? 'live' : 'draft' }));
      toast.success(form.published ? `${docLabel} for ${appLabel} saved and live` : `${docLabel} for ${appLabel} saved (not published)`);
    } catch (err) {
      toast.error(err?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveIndex = async (next, okMessage) => {
    try {
      const res = await api.put(pageEndpoint('legal-index'), next);
      setIndex(res.data?.data || next);
      toast.success(okMessage);
      return true;
    } catch (err) {
      toast.error(err?.message || 'Could not update the list');
      return false;
    }
  };

  const addItem = async () => {
    const label = newLabel.trim();
    if (!label) return;
    if (adding === 'app') {
      const id = slug(label).replace(/-/g, '').slice(0, 20);
      if (id.length < 2) return toast.error('Use a name with at least 2 letters or numbers');
      if (index.apps.some((a) => a.id === id)) return toast.error('That app already exists');
      if (await saveIndex({ ...index, apps: [...index.apps, { id, label }] }, `${label} added`)) setApp(id);
    } else {
      const id = slug(label).slice(0, 40);
      if (id.length < 2) return toast.error('Use a name with at least 2 letters or numbers');
      if (index.docs.some((d) => d.id === id)) return toast.error('That document already exists');
      if (await saveIndex({ ...index, docs: [...index.docs, { id, label }] }, `${label} added`)) setDoc(id);
    }
    setAdding(null);
    setNewLabel('');
  };

  const removeItem = async (type, id) => {
    const label = (type === 'app' ? index.apps : index.docs).find((x) => x.id === id)?.label || id;
    if (!window.confirm(`Remove "${label}" from the list? Its saved text is kept but it will no longer be listed.`)) return;
    const next =
      type === 'app'
        ? { ...index, apps: index.apps.filter((a) => a.id !== id) }
        : { ...index, docs: index.docs.filter((d) => d.id !== id) };
    if (await saveIndex(next, `${label} removed`)) {
      if (type === 'app' && app === id) setApp('user');
      if (type === 'doc' && doc === id) setDoc('privacy');
    }
  };

  const liveUrl = `/taxi/legal/${app}/${doc}`;
  const setSection = (i, patch) => setForm((f) => ({ ...f, sections: f.sections.map((x, idx) => (idx === i ? { ...x, ...patch } : x)) }));
  const moveSection = (i, dir) =>
    setForm((f) => {
      const next = [...f.sections];
      const j = i + dir;
      if (j < 0 || j >= next.length) return f;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, sections: next };
    });

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all';
  const labelClass = 'block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider';

  const Chip = ({ active, onClick, onRemove, children }) => (
    <span
      className={`inline-flex items-center rounded-xl border text-xs font-bold whitespace-nowrap transition-all ${
        active ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
      }`}
    >
      <button type="button" onClick={onClick} className="px-4 py-2.5 cursor-pointer">
        {children}
      </button>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove" className="pr-3 -ml-2 opacity-60 hover:opacity-100 cursor-pointer">
          <X size={13} />
        </button>
      )}
    </span>
  );

  const AddButton = ({ type, label }) => (
    <button
      type="button"
      onClick={() => {
        setAdding(adding === type ? null : type);
        setNewLabel('');
      }}
      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-dashed border-indigo-300 text-indigo-600 text-xs font-bold hover:bg-indigo-50 cursor-pointer whitespace-nowrap"
    >
      <Plus size={14} /> {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8 font-sans pb-24 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">
            <ShieldCheck size={14} /> CMS Builder / Legal Pages
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Privacy Policy, Terms, Refund &amp; more</h1>
          <p className="text-xs text-gray-500 font-medium">
            Pick an app or the website, pick a document, and write what that app should show. Every app can have its own text.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-6 py-2.5 bg-gray-900 hover:bg-black disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 justify-center shrink-0 cursor-pointer"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save
        </button>
      </div>

      {/* 1. App / website */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <div>
          <p className={labelClass}>1. Which app or website?</p>
          <div className="flex flex-wrap gap-2">
            {index.apps.map((a) => (
              <Chip
                key={a.id}
                active={app === a.id}
                onClick={() => setApp(a.id)}
                onRemove={BUILT_IN_APPS.includes(a.id) ? null : () => removeItem('app', a.id)}
              >
                {a.label}
                {status[a.id] && (
                  <span className={`ml-2 rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${status[a.id] === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {status[a.id] === 'live' ? 'Live' : 'Draft'}
                  </span>
                )}
              </Chip>
            ))}
            <AddButton type="app" label="Add app / website" />
          </div>
        </div>

        <div>
          <p className={labelClass}>2. Which document?</p>
          <div className="flex flex-wrap gap-2">
            {index.docs.map((d) => (
              <Chip
                key={d.id}
                active={doc === d.id}
                onClick={() => setDoc(d.id)}
                onRemove={BUILT_IN_DOCS.includes(d.id) ? null : () => removeItem('doc', d.id)}
              >
                {d.label}
              </Chip>
            ))}
            <AddButton type="doc" label="Add document" />
          </div>
        </div>

        {adding && (
          <div className="flex flex-col sm:flex-row gap-2 rounded-xl bg-indigo-50/60 border border-indigo-100 p-3">
            <input
              autoFocus
              className={inputClass}
              placeholder={adding === 'app' ? 'Name, e.g. Partner App' : 'Name, e.g. Safety Guidelines'}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
            />
            <button
              type="button"
              onClick={addItem}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <FilePlus2 size={14} /> Add
            </button>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
          <div>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-md mb-2 inline-block">
              {docLabel} · {appLabel}
            </span>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">{form.title || docLabel}</h3>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <ExternalLink size={13} /> Open live page
            </a>
            <div className="inline-flex rounded-xl border border-gray-200 p-1 bg-gray-50">
              {[
                ['edit', Edit3, 'Edit'],
                ['preview', Eye, 'Preview'],
              ].map(([mode, Icon, text]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={13} /> {text}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLiveSettingsPage && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
            The charges and rules on this page come from the pricing / cancellation settings and update automatically. Only the title is used from here.
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-400 font-medium">
            <Loader2 size={28} className="animate-spin mx-auto mb-3 text-indigo-600" /> Loading...
          </div>
        ) : viewMode === 'edit' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>{form.updatedAt ? `Last saved ${new Date(form.updatedAt).toLocaleString()}` : 'Not saved yet'}</span>
              <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline">
                Preview <ExternalLink size={12} />
              </a>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SwitchCard
                title="Published"
                hint={form.published ? 'Live in the app.' : 'When off, the page shows "not available" in the app.'}
                checked={form.published}
                onChange={(v) => setForm({ ...form, published: v })}
              />
              <SwitchCard
                title={'Show "Last updated" date'}
                hint="A small line under the title, set from the last save."
                checked={form.showUpdated}
                onChange={(v) => setForm({ ...form, showUpdated: v })}
              />
            </div>

            <div>
              <label className={labelClass}>Page Title</label>
              <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div>
              <label className={labelClass}>Short Summary (shown in the green box at the top)</label>
              <textarea
                className={`${inputClass} min-h-[84px] resize-y`}
                value={form.intro}
                onChange={(e) => setForm({ ...form, intro: e.target.value })}
                placeholder="One or two lines that tell people what this page is about."
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Sections (numbered automatically)</label>
                <span className="text-[11px] text-gray-400 font-medium">
                  In the text: <b>- Bullet</b> · <b>**Bold**</b> · blank line = new paragraph
                </span>
              </div>
              {form.sections.map((sec, i) => (
                <div key={i} className={`rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-3 ${sec.hidden ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-xs font-black text-white">{i + 1}</span>
                    <input
                      className={inputClass}
                      placeholder="Section heading, e.g. Eligibility and your account"
                      value={sec.heading}
                      onChange={(e) => setSection(i, { heading: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setSection(i, { hidden: !sec.hidden })}
                      aria-label={sec.hidden ? 'Show section' : 'Hide section'}
                      title={sec.hidden ? 'Hidden in the app - click to show' : 'Visible in the app - click to hide'}
                      className={`p-2 cursor-pointer ${sec.hidden ? 'text-amber-500' : 'text-gray-400 hover:text-gray-800'}`}
                    >
                      {sec.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button type="button" onClick={() => moveSection(i, -1)} disabled={i === 0} aria-label="Move up" className="p-2 text-gray-400 hover:text-gray-800 disabled:opacity-30 cursor-pointer">
                      <ArrowUp size={15} />
                    </button>
                    <button type="button" onClick={() => moveSection(i, 1)} disabled={i === form.sections.length - 1} aria-label="Move down" className="p-2 text-gray-400 hover:text-gray-800 disabled:opacity-30 cursor-pointer">
                      <ArrowDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, sections: f.sections.filter((_, idx) => idx !== i) }))}
                      aria-label="Delete section"
                      className="p-2 text-gray-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <textarea
                    className={`${inputClass} min-h-[140px] text-[13px] leading-relaxed resize-y`}
                    placeholder="Write the text for this section..."
                    value={sec.body}
                    onChange={(e) => setSection(i, { body: e.target.value })}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, sections: [...f.sections, blankSection()] }))}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-indigo-300 text-indigo-600 text-xs font-bold hover:bg-indigo-50 cursor-pointer"
              >
                <Plus size={14} /> Add section
              </button>
              <div className="flex justify-end border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-gray-900 hover:bg-black disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-[400px] p-6 bg-gray-50/70 rounded-xl border border-gray-200">
            <h2 className="text-xl font-black text-gray-900 mb-3">{form.title}</h2>
            {form.intro && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{form.intro}</p>}
            <div className="space-y-4">
              {form.sections.map((sec, i) => !sec.hidden && (
                <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="text-base font-black text-gray-900">{i + 1}. {sec.heading || 'Untitled section'}</h3>
                  <div className="prose prose-sm mt-3 max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: plainTextToLegalHtml(sec.body) }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CMSLegal;
