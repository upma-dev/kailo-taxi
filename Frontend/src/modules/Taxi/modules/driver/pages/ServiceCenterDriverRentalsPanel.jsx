import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createServiceCenterDriverRental, deleteServiceCenterDriverRental, getServiceCenterDriverRentals, updateServiceCenterDriverRental } from '../services/registrationService';
import { DriverFormModal, VehicleFormModal } from '../../shared/components/driverRental/DriverRentalForms';
import DriverBookingsList from '../../shared/components/driverRental/DriverBookingsList';
import ServiceCenterQuotesPanel from './ServiceCenterQuotesPanel';

const unwrap = (response) => response?.data?.data || response?.data || response || {};
const errorText = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

// Service center app: everything for "Rental with Driver" and custom quotes in one place.
//  Bookings: handed to the center (staff see the ones handed to them) - choose the driver, confirm, complete
//  Drivers and Vehicles: the owner manages the center's listed drivers and its vehicles with their packages
//  Quotes: custom quote requests
const ServiceCenterDriverRentalsPanel = ({ isStaffUser = false, focus = null }) => {
  const [tab, setTab] = useState('bookings');

  // An alert asked to open one of the sections.
  useEffect(() => {
    if (focus?.tab) setTab(focus.tab);
  }, [focus]);
  const [data, setData] = useState({ permissions: { canManage: false }, vehicles: [], drivers: [], bookings: [], staff: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [vehicleForm, setVehicleForm] = useState(null);
  const [driverForm, setDriverForm] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(unwrap(await getServiceCenterDriverRentals()));
    } catch (error) {
      toast.error(errorText(error, 'Could not load rental with driver.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const canManage = Boolean(data.permissions?.canManage);

  const run = async (action, doneMessage, after) => {
    setSaving(true);
    try {
      await action();
      toast.success(doneMessage);
      after?.();
      await load();
      return true;
    } catch (error) {
      toast.error(errorText(error, 'Could not save.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveVehicle = (payload) =>
    run(
      () => (vehicleForm?.id ? updateServiceCenterDriverRental('vehicles', vehicleForm.id, payload) : createServiceCenterDriverRental('vehicles', payload)),
      vehicleForm?.id ? 'Vehicle updated' : 'Vehicle added',
      () => setVehicleForm(null),
    );
  const saveDriver = (payload) =>
    run(
      () => (driverForm?.id ? updateServiceCenterDriverRental('drivers', driverForm.id, payload) : createServiceCenterDriverRental('drivers', payload)),
      driverForm?.id ? 'Driver updated' : 'Driver added',
      () => setDriverForm(null),
    );
  const updateBooking = async (id, payload) => {
    setSavingId(id);
    const ok = await run(() => updateServiceCenterDriverRental('bookings', id, payload), 'Booking updated');
    setSavingId('');
    return ok;
  };

  const tabs = [
    { key: 'bookings', label: 'Bookings', count: data.bookings.filter((b) => ['pending', 'confirmed', 'assigned'].includes(b.status)).length },
    ...(isStaffUser ? [] : [{ key: 'drivers', label: 'Drivers' }, { key: 'vehicles', label: 'Vehicles' }]),
    { key: 'quotes', label: 'Quotes' },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900">Rental with driver</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          {isStaffUser ? 'Bookings and quote requests handed to you.' : 'Bookings for your vehicles, your drivers, and your vehicles with their packages.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-full border px-4 py-2 text-xs font-bold transition ${tab === item.key ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            {item.label}
            {item.count ? <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">{item.count}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'quotes' ? (
        <ServiceCenterQuotesPanel isStaffUser={isStaffUser} />
      ) : loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-400">Loading...</div>
      ) : tab === 'bookings' ? (
        <DriverBookingsList
          bookings={data.bookings}
          drivers={data.drivers}
          staff={data.staff}
          canAssignStaff={canManage}
          onUpdate={updateBooking}
          savingId={savingId}
        />
      ) : tab === 'drivers' ? (
        <div className="space-y-3">
          <button type="button" onClick={() => setDriverForm({})} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white">
            <Plus size={16} /> Add driver
          </button>
          {data.drivers.length === 0 ? <p className="text-sm font-semibold text-slate-400">No drivers listed yet.</p> : null}
          {data.drivers.map((driver) => (
            <div key={driver.id} className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-900">{driver.name}</p>
                <p className="text-xs font-semibold text-slate-500">{driver.phone} - {driver.experienceYears} yrs{driver.languages.length ? ` - ${driver.languages.join(', ')}` : ''}</p>
                {driver.licenseNumber ? <p className="text-xs font-semibold text-slate-400">Licence {driver.licenseNumber}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => run(() => updateServiceCenterDriverRental('drivers', driver.id, { active: !driver.active }), driver.active ? 'Driver switched off' : 'Driver switched on')}
                className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${driver.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
              >
                {driver.active ? 'Active' : 'Off'}
              </button>
              <button type="button" onClick={() => setDriverForm(driver)} className="rounded-lg border border-slate-200 p-2 text-slate-500" aria-label="Edit"><Pencil size={15} /></button>
              <button
                type="button"
                onClick={() => window.confirm(`Remove ${driver.name}?`) && run(() => deleteServiceCenterDriverRental('drivers', driver.id), 'Driver removed')}
                className="rounded-lg border border-slate-200 p-2 text-rose-500"
                aria-label="Remove"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <button type="button" onClick={() => setVehicleForm({})} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white">
            <Plus size={16} /> Add vehicle
          </button>
          {data.vehicles.length === 0 ? <p className="text-sm font-semibold text-slate-400">No vehicles yet.</p> : null}
          {data.vehicles.map((vehicle) => {
            const mine = Boolean(vehicle.ownerCenterId);
            return (
              <div key={vehicle.id} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {vehicle.image ? <img src={vehicle.image} alt="" className="h-14 w-20 shrink-0 object-contain" /> : <div className="h-14 w-20 shrink-0 rounded-xl bg-slate-100" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-900">{vehicle.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{vehicle.vehicleCategory} - {vehicle.capacity} seats</p>
                    <p className="text-[11px] font-semibold text-slate-400">{mine ? 'Added by your center' : 'Managed by the admin'}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${vehicle.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {vehicle.active ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <div className="mt-3 space-y-1">
                  {vehicle.packages.map((pkg) => (
                    <div key={pkg.id} className={`flex justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold ${pkg.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                      <span>{pkg.label}</span>
                      <span>Rs {pkg.price}</span>
                    </div>
                  ))}
                </div>
                {mine ? (
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => setVehicleForm(vehicle)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"><Pencil size={13} /> Edit</button>
                    <button
                      type="button"
                      onClick={() => window.confirm(`Remove ${vehicle.name}?`) && run(() => deleteServiceCenterDriverRental('vehicles', vehicle.id), 'Vehicle removed')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-rose-500"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {vehicleForm ? <VehicleFormModal initial={vehicleForm.id ? vehicleForm : null} onSave={saveVehicle} onClose={() => setVehicleForm(null)} saving={saving} /> : null}
      {driverForm ? <DriverFormModal initial={driverForm.id ? driverForm : null} onSave={saveDriver} onClose={() => setDriverForm(null)} saving={saving} /> : null}
    </section>
  );
};

export default ServiceCenterDriverRentalsPanel;
