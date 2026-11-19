import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { uploadService } from '../../../../shared/services/uploadService';

// Forms for "Rental with Driver", shared by the admin panel and the service center app:
// a vehicle with its own packages, and a listed driver.

export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100';
const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500';

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Field = ({ label, children }) => (
  <div>
    <label className={labelClass}>{label}</label>
    {children}
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const ImagePicker = ({ value, onChange, folder }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const upload = await uploadService.uploadImage(await fileToDataUrl(file), folder);
      const url = upload?.url || upload?.secureUrl || '';
      if (!url) throw new Error('Upload failed');
      onChange(url);
    } catch (error) {
      toast.error(error?.message || 'Could not upload the picture.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400"
      >
        {busy ? <Loader2 size={20} className="animate-spin" /> : value ? <img src={value} alt="" className="h-full w-full object-contain" /> : <ImagePlus size={22} />}
      </button>
      <div className="text-xs font-semibold text-slate-400">
        <p>Tap to {value ? 'change' : 'add'} the picture.</p>
        {value ? (
          <button type="button" onClick={() => onChange('')} className="mt-1 text-rose-500">Remove picture</button>
        ) : null}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
};

const EMPTY_PACKAGE = { label: '', durationHours: '', kmLimit: '', price: '', extraHourPrice: '', extraKmPrice: '', active: true };

/** `centers` (optional): when given, the admin can choose which service centers serve the vehicle. */
export const VehicleFormModal = ({ initial, centers, onSave, onClose, saving, readOnlyNote = '' }) => {
  const [form, setForm] = useState(() => ({
    name: initial?.name || '',
    vehicleCategory: initial?.vehicleCategory || 'Car',
    capacity: initial?.capacity ?? 4,
    luggageCapacity: initial?.luggageCapacity ?? 0,
    image: initial?.image || '',
    description: initial?.description || '',
    amenities: (initial?.amenities || []).join(', '),
    serviceCenterIds: (initial?.serviceCenters || []).map((center) => center.id),
    active: initial?.active !== false,
    packages: initial?.packages?.length ? initial.packages.map((pkg) => ({ ...pkg })) : [{ ...EMPTY_PACKAGE }],
  }));
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const setPackage = (index, patch) => set({ packages: form.packages.map((pkg, i) => (i === index ? { ...pkg, ...patch } : pkg)) });

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error('Enter the vehicle name.');
    const packages = form.packages.filter((pkg) => pkg.label || pkg.price);
    if (!packages.length) return toast.error('Add at least one package with a price.');
    if (packages.some((pkg) => !pkg.label.trim() || !(Number(pkg.price) > 0))) return toast.error('Every package needs a name and a price.');
    onSave({
      ...form,
      amenities: form.amenities.split(',').map((item) => item.trim()).filter(Boolean),
      packages,
    });
  };

  return (
    <Modal title={initial?.id ? 'Edit vehicle' : 'Add vehicle with driver'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {readOnlyNote ? <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">{readOnlyNote}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Vehicle name"><input value={form.name} onChange={(event) => set({ name: event.target.value })} className={inputClass} placeholder="e.g. Toyota Innova Crysta" /></Field>
          <Field label="Category">
            <select value={form.vehicleCategory} onChange={(event) => set({ vehicleCategory: event.target.value })} className={inputClass}>
              {['Hatchback', 'Sedan', 'SUV', 'Van', 'Bus', 'Car', 'Bike'].map((option) => <option key={option}>{option}</option>)}
            </select>
          </Field>
          <Field label="Seats"><input type="number" min="1" value={form.capacity} onChange={(event) => set({ capacity: event.target.value })} className={inputClass} /></Field>
          <Field label="Bags it can carry"><input type="number" min="0" value={form.luggageCapacity} onChange={(event) => set({ luggageCapacity: event.target.value })} className={inputClass} /></Field>
        </div>
        <Field label="Picture"><ImagePicker value={form.image} onChange={(image) => set({ image })} folder="rental-driver" /></Field>
        <Field label="Short description"><textarea rows="2" value={form.description} onChange={(event) => set({ description: event.target.value })} className={inputClass} /></Field>
        <Field label="Features (separate with commas)"><input value={form.amenities} onChange={(event) => set({ amenities: event.target.value })} className={inputClass} placeholder="AC, Verified driver, Music system" /></Field>

        {Array.isArray(centers) ? (
          <Field label="Service centers that serve this vehicle">
            <div className="flex flex-wrap gap-2">
              {centers.length === 0 ? <p className="text-xs font-semibold text-slate-400">No service centers yet.</p> : null}
              {centers.map((center) => {
                const on = form.serviceCenterIds.includes(center.id);
                return (
                  <button
                    key={center.id}
                    type="button"
                    onClick={() => set({ serviceCenterIds: on ? form.serviceCenterIds.filter((id) => id !== center.id) : [...form.serviceCenterIds, center.id] })}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    {center.name}
                  </button>
                );
              })}
            </div>
          </Field>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={labelClass}>Packages and prices</span>
            <button type="button" onClick={() => set({ packages: [...form.packages, { ...EMPTY_PACKAGE }] })} className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
              <Plus size={13} /> Add package
            </button>
          </div>
          {form.packages.map((pkg, index) => (
            <div key={index} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-center gap-2">
                <input value={pkg.label} onChange={(event) => setPackage(index, { label: event.target.value })} className={inputClass} placeholder="Package name, e.g. 8 hours / 80 km" />
                <button type="button" onClick={() => set({ packages: form.packages.filter((_, i) => i !== index) })} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label="Remove package">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  ['durationHours', 'Hours'],
                  ['kmLimit', 'Km included'],
                  ['price', 'Price (Rs)'],
                  ['extraHourPrice', 'Extra hour (Rs)'],
                  ['extraKmPrice', 'Extra km (Rs)'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</label>
                    <input type="number" min="0" value={pkg[key]} onChange={(event) => setPackage(index, { [key]: event.target.value })} className={inputClass} />
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input type="checkbox" checked={pkg.active !== false} onChange={(event) => setPackage(index, { active: event.target.checked })} /> Available to riders
              </label>
            </div>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={form.active} onChange={(event) => set({ active: event.target.checked })} /> Show this vehicle to riders
        </label>

        <button type="submit" disabled={saving} className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
          {saving ? 'Saving...' : initial?.id ? 'Save changes' : 'Add vehicle'}
        </button>
      </form>
    </Modal>
  );
};

/** `centers` (optional): when given (admin), the driver is placed in one of them. */
export const DriverFormModal = ({ initial, centers, onSave, onClose, saving }) => {
  const [form, setForm] = useState(() => ({
    name: initial?.name || '',
    phone: initial?.phone || '',
    licenseNumber: initial?.licenseNumber || '',
    experienceYears: initial?.experienceYears ?? 0,
    languages: (initial?.languages || []).join(', '),
    photo: initial?.photo || '',
    serviceCenterId: initial?.serviceCenterId || '',
    active: initial?.active !== false,
  }));
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error('Enter the driver name.');
    if (String(form.phone).replace(/\D/g, '').length < 10) return toast.error('Enter a valid 10-digit phone number.');
    if (Array.isArray(centers) && !form.serviceCenterId) return toast.error('Choose the service center.');
    onSave({ ...form, languages: form.languages.split(',').map((item) => item.trim()).filter(Boolean) });
  };

  return (
    <Modal title={initial?.id ? 'Edit driver' : 'Add driver'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Driver name"><input value={form.name} onChange={(event) => set({ name: event.target.value })} className={inputClass} /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(event) => set({ phone: event.target.value })} inputMode="numeric" className={inputClass} /></Field>
          <Field label="Licence number"><input value={form.licenseNumber} onChange={(event) => set({ licenseNumber: event.target.value })} className={inputClass} /></Field>
          <Field label="Years of experience"><input type="number" min="0" value={form.experienceYears} onChange={(event) => set({ experienceYears: event.target.value })} className={inputClass} /></Field>
        </div>
        <Field label="Languages (separate with commas)"><input value={form.languages} onChange={(event) => set({ languages: event.target.value })} className={inputClass} placeholder="Hindi, English" /></Field>
        {Array.isArray(centers) ? (
          <Field label="Service center">
            <select value={form.serviceCenterId} onChange={(event) => set({ serviceCenterId: event.target.value })} className={inputClass}>
              <option value="">Choose service center</option>
              {centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
            </select>
          </Field>
        ) : null}
        <Field label="Photo (optional)"><ImagePicker value={form.photo} onChange={(photo) => set({ photo })} folder="rental-driver" /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={form.active} onChange={(event) => set({ active: event.target.checked })} /> Available for bookings
        </label>
        <button type="submit" disabled={saving} className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
          {saving ? 'Saving...' : initial?.id ? 'Save changes' : 'Add driver'}
        </button>
      </form>
    </Modal>
  );
};
