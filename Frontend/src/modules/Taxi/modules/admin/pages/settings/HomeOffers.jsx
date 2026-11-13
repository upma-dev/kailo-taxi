import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Package, Pencil, Plus, Trash2, X } from 'lucide-react';
import api from '../../../../shared/api/axiosInstance';
import { BANNER_THEMES } from '@/shared/components/auth/LoginBanners';
import { OfferStageCard } from '@/shared/components/OfferStageCard';

const unwrap = (response) => response?.data?.data || response?.data || response;
const errorMessage = (err) => err?.response?.data?.message || err?.message || 'Something went wrong';

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500';

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}
  >
    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
  </button>
);

// Pictures are shrunk in the browser first (PNG keeps the transparent background of cut-out cars).
const fileToDataUrl = (file, maxSide = 800) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('That file is not a valid image'));
      image.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

const ImagePicker = ({ label, hint, value, onChange }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const dataUrl = await fileToDataUrl(file);
      const result = unwrap(await api.post('/admin/upload-image', { image: dataUrl }));
      const url = result?.url || result?.data?.url;
      if (!url) throw new Error('Upload failed');
      onChange(url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-500">{label}</label>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {value ? <img src={value} alt="" className="h-full w-full object-contain" /> : <Package size={22} className="text-gray-300" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
              {value ? 'Change picture' : 'Upload picture'}
            </button>
            {value ? (
              <button type="button" onClick={() => onChange('')} className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                Remove
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-gray-400">{error || hint}</p>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Offer cards: shown on the user home, below "Our Services".
// ---------------------------------------------------------------------------------------------
const LINK_OPTIONS = [
  { id: 'none', label: 'Do nothing', path: '' },
  { id: 'ride', label: 'Book a ride', path: '/taxi/user/ride/select-location' },
  { id: 'parcel', label: 'Parcel', path: '/taxi/user/parcel/type' },
  { id: 'outstation', label: 'Outstation', path: '/taxi/user/intercity' },
  { id: 'airport', label: 'Airport', path: '/taxi/user/cab/airport' },
  { id: 'bus', label: 'Bus', path: '/taxi/user/bus' },
  { id: 'pooling', label: 'Pooling', path: '/taxi/user/pooling' },
  { id: 'rental', label: 'Rental', path: '/taxi/user/rental' },
  { id: 'custom', label: 'Website link', path: null },
];

const linkChoice = (link) => {
  const value = String(link || '');
  if (!value) return 'none';
  return LINK_OPTIONS.find((option) => option.path === value)?.id || 'custom';
};

const emptyOffer = (placement = 'top') => ({ tag: '', code: '', title: '', subtitle: '', cta: '', theme: 'brand', image: '', link: '', placement, active: true });

const OfferModal = ({ initial, onClose, onSaved }) => {
  const [form, setForm] = useState(initial);
  const [choice, setChoice] = useState(linkChoice(initial.link));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const pickLink = (id) => {
    setChoice(id);
    const option = LINK_OPTIONS.find((item) => item.id === id);
    set('link', option?.path ?? '');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        tag: form.tag, code: form.code, title: form.title, subtitle: form.subtitle, cta: form.cta,
        theme: form.theme, image: form.image, link: form.link, placement: form.placement || 'top', active: form.active,
      };
      if (form._id) await api.patch(`/admin/home-offers/${form._id}`, payload);
      else await api.post('/admin/home-offers', payload);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{form._id ? 'Edit offer card' : 'Add offer card'}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Tag (small label)</label>
                <input value={form.tag} onChange={(e) => set('tag', e.target.value)} maxLength={30} placeholder="WELCOME OFFER" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Promo code (optional)</label>
                <input value={form.code} onChange={(e) => set('code', e.target.value)} maxLength={30} placeholder="FIRST100" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Title *</label>
              <input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={80} placeholder="Flat Rs.100 OFF on your first ride" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Text</label>
              <textarea rows={2} value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} maxLength={140} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Colour</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(BANNER_THEMES).map(([id, theme]) => (
                  <button
                    key={id}
                    type="button"
                    title={theme.label}
                    onClick={() => set('theme', id)}
                    className={`h-8 w-8 rounded-full border-2 ${form.theme === id ? 'border-gray-900' : 'border-transparent'}`}
                    style={{ background: theme.gradient }}
                  />
                ))}
              </div>
            </div>
            <ImagePicker label="Banner picture" hint="Shown on the right side of the card. A transparent PNG (a gift, a car, a bus) works best." value={form.image} onChange={(v) => set('image', v)} />
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Button text (shown when the card opens something)</label>
              <input value={form.cta} onChange={(e) => set('cta', e.target.value)} maxLength={30} placeholder="Book a ride" className={`${inputClass} mb-3`} />
              <label className="mb-1 block text-xs font-semibold text-gray-500">When the card is tapped</label>
              <select value={choice} onChange={(e) => pickLink(e.target.value)} className={inputClass}>
                {LINK_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
              {choice === 'custom' ? (
                <input value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="https://..." className={`${inputClass} mt-2`} />
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Live preview</p>
            <OfferStageCard offer={{ ...form, title: form.title || 'Offer title' }} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          {error ? <span className="mr-auto text-xs text-red-500">{error}</span> : null}
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const OffersSection = ({ placement = 'top', title = 'Offer cards', description }) => {
  const [offers, setOffers] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = unwrap(await api.get('/admin/home-offers'));
      // Cards saved before placements existed have none and count as 'top'.
      setOffers((Array.isArray(data?.results) ? data.results : []).filter((offer) => (offer.placement || 'top') === placement));
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [placement]);

  useEffect(() => { load(); }, [load]);

  const run = async (task) => {
    try {
      await task();
      await load();
    } catch (err) {
      window.alert(errorMessage(err));
    }
  };

  const move = (index, delta) =>
    run(async () => {
      const target = index + delta;
      if (target < 0 || target >= offers.length) return;
      const ids = offers.map((offer) => offer._id);
      [ids[index], ids[target]] = [ids[target], ids[index]];
      await api.post('/admin/home-offers/reorder', { ids });
    });

  const remove = (offer) => {
    if (!window.confirm('Delete this offer card?')) return;
    run(() => api.delete(`/admin/home-offers/${offer._id}`));
  };

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setModal(emptyOffer(placement))}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> Add card
        </button>
      </div>

      {error ? (
        <p className="py-6 text-center text-sm text-red-500">{error}</p>
      ) : offers === null ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600" /></div>
      ) : offers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-400">
          No offer cards yet. Click &ldquo;Add card&rdquo; to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((offer, index) => (
            <div key={offer._id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
              <div className="min-w-0 flex-1"><OfferStageCard offer={offer} compact /></div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{offer.active ? 'Visible' : 'Hidden'}</span>
                  <Toggle checked={offer.active} onChange={(v) => run(() => api.patch(`/admin/home-offers/${offer._id}`, { active: v }))} />
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button type="button" disabled={index === offers.length - 1} onClick={() => move(index, 1)} className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30"><ArrowDown size={14} /></button>
                  <button type="button" onClick={() => setModal({ ...emptyOffer(), ...offer })} className="rounded p-1.5 hover:bg-indigo-50 hover:text-indigo-600"><Pencil size={14} /></button>
                  <button type="button" onClick={() => remove(offer)} className="rounded p-1.5 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal ? <OfferModal initial={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} /> : null}
    </div>
  );
};

const HomeOffers = () => (
  <div className="min-h-full bg-gray-50 p-6 text-gray-900 lg:p-8">
    <div className="mb-2">
      <h1 className="text-xl font-semibold">Home Offers</h1>
      <p className="mt-1 text-sm text-gray-500">
        The offer cards on the user app home, right under the top banner. The services and rides shown at the top
        come from <span className="font-medium text-gray-700">Price Management &rarr; App Modules</span> and{' '}
        <span className="font-medium text-gray-700">Vehicle Type</span>, so add or change them there.
      </p>
    </div>
    <OffersSection
      placement="top"
      title="Offer cards"
      description={'Offers, promo codes and announcements. They slide automatically when there is more than one. Changes go live instantly.'}
    />
  </div>
);

export default HomeOffers;
