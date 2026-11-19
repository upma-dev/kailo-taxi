import React, { useCallback, useEffect, useState } from 'react';
import { Eye, Pencil, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import { DriverFormModal, VehicleFormModal } from '../../../shared/components/driverRental/DriverRentalForms';
import DriverBookingsList from '../../../shared/components/driverRental/DriverBookingsList';

const rowsOf = (payload) => payload?.data?.data?.results || payload?.data?.results || payload?.results || [];
const errorText = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const TABS = [
  { key: 'bookings', label: 'Bookings' },
  { key: 'vehicles', label: 'Vehicles and packages' },
  { key: 'drivers', label: 'Drivers' },
];

// Admin: the "Rental with Driver" bookings, its own vehicles and packages, and the drivers listed under each service center.
const DriverRentals = () => {
  const [tab, setTab] = useState('bookings');
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [centers, setCenters] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [vehicleForm, setVehicleForm] = useState(null); // null = closed, {} = new, vehicle = edit
  const [driverForm, setDriverForm] = useState(null);
  const [vehicleView, setVehicleView] = useState(null);

  const load = useCallback(async () => {
    try {
      const [v, d, b, c, s] = await Promise.all([
        adminService.getDriverRentalVehicles(),
        adminService.getRentalDrivers(),
        adminService.getDriverRentalBookings(),
        adminService.getServiceStores(),
        adminService.getServiceCenterStaff(),
      ]);
      setVehicles(rowsOf(v));
      setDrivers(rowsOf(d));
      setBookings(rowsOf(b));
      setCenters(rowsOf(c).map((row) => ({ id: String(row.id || row._id), name: row.name || 'Service center' })));
      setStaff(rowsOf(s));
    } catch (error) {
      toast.error(errorText(error, 'Could not load rental with driver data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      () => (vehicleForm?.id ? adminService.updateDriverRentalVehicle(vehicleForm.id, payload) : adminService.createDriverRentalVehicle(payload)),
      vehicleForm?.id ? 'Vehicle updated' : 'Vehicle added',
      () => setVehicleForm(null),
    );

  const saveDriver = (payload) =>
    run(
      () => (driverForm?.id ? adminService.updateRentalDriver(driverForm.id, payload) : adminService.createRentalDriver(payload)),
      driverForm?.id ? 'Driver updated' : 'Driver added',
      () => setDriverForm(null),
    );

  const toggleVehicle = (vehicle) => run(() => adminService.updateDriverRentalVehicle(vehicle.id, { active: !vehicle.active }), vehicle.active ? 'Vehicle hidden from riders' : 'Vehicle shown to riders');
  const toggleDriver = (driver) => run(() => adminService.updateRentalDriver(driver.id, { active: !driver.active }), driver.active ? 'Driver switched off' : 'Driver switched on');
  const removeVehicle = (vehicle) => window.confirm(`Remove ${vehicle.name}?`) && run(() => adminService.deleteDriverRentalVehicle(vehicle.id), 'Vehicle removed');
  const removeDriver = (driver) => window.confirm(`Remove ${driver.name}?`) && run(() => adminService.deleteRentalDriver(driver.id), 'Driver removed');

  const updateBooking = async (id, payload) => {
    setSavingId(id);
    const ok = await run(() => adminService.updateDriverRentalBooking(id, payload), 'Booking updated');
    setSavingId('');
    return ok;
  };

  const removeBooking = (booking) => window.confirm(`Delete booking ${booking.bookingReference}?`) && run(() => adminService.deleteDriverRentalBooking(booking.id), 'Booking deleted');

  const openCount = bookings.filter((booking) => booking.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Rental with Driver</h1>
        <p className="mt-1 text-sm text-slate-500">
          Vehicles that come with a driver have their own packages, separate from the self-drive rentals. Service centers see the bookings of their vehicles and assign a driver from their list.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition ${tab === item.key ? 'border-[#2e3c78] bg-[#2e3c78] text-white' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            {item.label}
            {item.key === 'bookings' && openCount > 0 ? <span className="ml-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] text-white">{openCount}</span> : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-400">Loading...</div>
      ) : tab === 'bookings' ? (
        <DriverBookingsList bookings={bookings} drivers={drivers} staff={staff} centers={centers} canAssignStaff onUpdate={updateBooking} onDelete={removeBooking} savingId={savingId} variant="table" />
      ) : tab === 'vehicles' ? (
        <div className="space-y-4">
          <button type="button" onClick={() => setVehicleForm({})} className="inline-flex items-center gap-2 rounded-xl bg-[#2e3c78] px-5 py-3 text-sm font-bold text-white">
            <Plus size={16} /> Add vehicle
          </button>
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3">Vehicle</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Seats</th><th className="px-5 py-3">Service centers</th><th className="px-5 py-3">Packages</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.length === 0 ? <tr><td colSpan={7} className="px-5 py-8 text-slate-400">No vehicles yet.</td></tr> : null}
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {vehicle.image ? <img src={vehicle.image} alt="" className="h-10 w-14 shrink-0 object-contain" /> : <div className="h-10 w-14 shrink-0 rounded-lg bg-slate-100" />}
                        <span className="font-bold text-slate-900">{vehicle.name}{vehicle.ownerCenterId ? <span className="block text-xs font-semibold text-slate-400">added by the center</span> : null}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-600">{vehicle.vehicleCategory}</td>
                    <td className="px-5 py-3 font-semibold text-slate-600">{vehicle.capacity}</td>
                    <td className="px-5 py-3 font-semibold text-slate-600">{vehicle.serviceCenters.length ? vehicle.serviceCenters.map((center) => center.name).join(', ') : '-'}</td>
                    <td className="px-5 py-3 font-semibold text-slate-600">{vehicle.packages.length}</td>
                    <td className="px-5 py-3">
                      <button type="button" onClick={() => toggleVehicle(vehicle)} className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${vehicle.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {vehicle.active ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setVehicleView(vehicle)} className="rounded-lg border border-slate-200 p-2 text-slate-500" aria-label="View"><Eye size={15} /></button>
                        <button type="button" onClick={() => setVehicleForm(vehicle)} className="rounded-lg border border-slate-200 p-2 text-slate-500" aria-label="Edit"><Pencil size={15} /></button>
                        <button type="button" onClick={() => removeVehicle(vehicle)} className="rounded-lg border border-slate-200 p-2 text-rose-500" aria-label="Remove"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button type="button" onClick={() => setDriverForm({})} className="inline-flex items-center gap-2 rounded-xl bg-[#2e3c78] px-5 py-3 text-sm font-bold text-white">
            <Plus size={16} /> Add driver
          </button>
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3">Driver</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Experience</th><th className="px-5 py-3">Service center</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.length === 0 ? <tr><td colSpan={6} className="px-5 py-8 text-slate-400">No drivers yet.</td></tr> : null}
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-bold text-slate-900">{driver.name}<span className="block text-xs font-semibold text-slate-400">{driver.languages.join(', ')}</span></td>
                    <td className="px-5 py-3 font-semibold text-slate-600">{driver.phone}</td>
                    <td className="px-5 py-3 font-semibold text-slate-600">{driver.experienceYears} yrs</td>
                    <td className="px-5 py-3 font-semibold text-slate-600">{driver.serviceCenterName || '-'}</td>
                    <td className="px-5 py-3">
                      <button type="button" onClick={() => toggleDriver(driver)} className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${driver.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {driver.active ? 'Active' : 'Off'}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setDriverForm(driver)} className="rounded-lg border border-slate-200 p-2 text-slate-500" aria-label="Edit"><Pencil size={15} /></button>
                        <button type="button" onClick={() => removeDriver(driver)} className="rounded-lg border border-slate-200 p-2 text-rose-500" aria-label="Remove"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vehicleView ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setVehicleView(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {vehicleView.image ? <img src={vehicleView.image} alt="" className="h-16 w-24 shrink-0 object-contain" /> : <div className="h-16 w-24 shrink-0 rounded-xl bg-slate-100" />}
                <div>
                  <h3 className="text-lg font-black text-slate-900">{vehicleView.name}</h3>
                  <p className="text-xs font-semibold text-slate-500">{vehicleView.vehicleCategory} - {vehicleView.capacity} seats - {vehicleView.active ? 'Active' : 'Hidden'}</p>
                </div>
              </div>
              <button type="button" onClick={() => setVehicleView(null)} className="rounded-lg border border-slate-200 p-2 text-slate-500" aria-label="Close"><X size={16} /></button>
            </div>
            <p className="mb-3 text-xs font-semibold text-slate-500">
              {vehicleView.serviceCenters.length ? vehicleView.serviceCenters.map((center) => center.name).join(', ') : 'No service center linked'}
              {vehicleView.ownerCenterId ? ' (added by the center)' : ''}
            </p>
            <div className="space-y-1">
              {vehicleView.packages.map((pkg) => (
                <div key={pkg.id} className={`flex justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold ${pkg.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                  <span>{pkg.label}</span>
                  <span>Rs {pkg.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {vehicleForm ? <VehicleFormModal initial={vehicleForm.id ? vehicleForm : null} centers={centers} onSave={saveVehicle} onClose={() => setVehicleForm(null)} saving={saving} /> : null}
      {driverForm ? <DriverFormModal initial={driverForm.id ? driverForm : null} centers={centers} onSave={saveDriver} onClose={() => setDriverForm(null)} saving={saving} /> : null}
    </div>
  );
};

export default DriverRentals;
