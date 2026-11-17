import 'dotenv/config';
import mongoose from 'mongoose';
import { BusService } from '../src/modules/taxi/admin/models/BusService.js';
import { BusDriver } from '../src/modules/taxi/driver/models/BusDriver.js';
import { BusBooking } from '../src/modules/taxi/user/models/BusBooking.js';
import { BusSeatHold } from '../src/modules/taxi/user/models/BusSeatHold.js';
import { TripSeatInventory } from '../src/modules/taxi/user/models/TripSeatInventory.js';
import { approveBusService, rejectBusService } from '../src/modules/taxi/admin/services/adminService.js';

const B = 'http://localhost:5000/api/v1/taxi';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};
const req = async (method, path, body, headers = {}) => {
  const r = await fetch(B + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const login = async (phone, role) => {
  await req('POST', '/drivers/auth/send-otp', { phone, role });
  const r = await req('POST', '/drivers/auth/verify-otp', { phone, otp: '1234', role });
  return r.body?.data?.token ? { Authorization: 'Bearer ' + r.body.data.token } : null;
};
const dateKey = (offset = 0) => {
  const d = new Date(Date.now() + offset * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || undefined });

const OWNER = '9000000006';
const NEW_DRIVER = '9000000011';
const ALL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const rows = [1, 2, 3].map((r) => [
  { kind: 'seat', id: `${r}A`, label: `${r}A`, variant: 'window', status: 'available' },
  { kind: 'seat', id: `${r}B`, label: `${r}B`, variant: 'aisle', status: 'available' },
  { kind: 'aisle', id: '', label: '', variant: 'seat', status: 'available' },
  { kind: 'seat', id: `${r}C`, label: `${r}C`, variant: 'aisle', status: 'available' },
  { kind: 'seat', id: `${r}D`, label: `${r}D`, variant: 'window', status: 'available' },
]);
const newBusPayload = (extra = {}) => ({
  busName: 'E2E Test Bus',
  operatorName: 'E2E Travels',
  serviceNumber: 'E2E-1',
  registrationNumber: 'MP00E2E0001',
  coachType: 'AC Seater',
  busCategory: 'Seater',
  seatPrice: 300,
  variantPricing: { seat: 300, window: 350, aisle: 300, sleeper: 300 },
  capacity: 12,
  blueprint: { templateKey: 'seater_2_2', lowerDeck: rows, upperDeck: [] },
  route: { routeName: 'Indore - Ujjain', originCity: 'Indore', destinationCity: 'Ujjain', distanceKm: '55', durationHours: '1.5', stops: [] },
  schedules: [{ id: 'sched-e2e', label: 'Late night', departureTime: '11:30 PM', arrivalTime: '11:55 PM', activeDays: ALL, status: 'active' }],
  driverName: 'E2E Driver',
  driverPhone: NEW_DRIVER,
  ...extra,
});

let busId = null;
try {
  // clean any leftovers from a previous failed run
  const old = await BusService.find({ registrationNumber: 'MP00E2E0001' });
  for (const b of old) {
    await BusBooking.deleteMany({ busServiceId: b._id });
    await BusSeatHold.deleteMany({ busServiceId: b._id });
    await TripSeatInventory.deleteMany({ busServiceId: b._id });
    await BusService.deleteOne({ _id: b._id });
  }
  await BusDriver.deleteMany({ phone: NEW_DRIVER });

  console.log('\n--- OWNER: reads');
  const O = await login(OWNER, 'owner');
  check('owner login', !!O);
  const dash = await req('GET', '/drivers/fleet/dashboard', undefined, O);
  check('owner dashboard', dash.status === 200 && dash.body.data?.busOverview, `buses=${dash.body.data?.busOverview?.totalBuses} busDrivers=${dash.body.data?.busOverview?.totalBusDrivers}`);
  const list0 = await req('GET', '/drivers/fleet/bus-services', undefined, O);
  check('owner list buses', list0.status === 200 && Array.isArray(list0.body.data), `count=${list0.body.data?.length}`);
  const bk0 = await req('GET', '/drivers/fleet/bus-bookings', undefined, O);
  check('owner bus bookings list', bk0.status === 200, `status=${bk0.status}`);
  const cal = await req('GET', `/drivers/fleet/bus-bookings/calendar?month=${dateKey().slice(0, 7)}`, undefined, O);
  check('owner bookings calendar', cal.status === 200, `status=${cal.status}`);
  const wal = await req('GET', '/drivers/fleet/wallet', undefined, O);
  check('owner wallet', wal.status === 200, `status=${wal.status}`);

  console.log('\n--- OWNER: create bus (needs admin approval)');
  const created = await req('POST', '/drivers/fleet/bus-services', newBusPayload({ status: 'active' }), O);
  busId = created.body.data?.id || created.body.data?._id;
  check('create bus -> 201', created.status === 201 && busId, `status=${created.status} ${created.body.message || ''}`);
  check('owner cannot self-approve (status forced pending)', created.body.data?.status === 'pending_approval', `status=${created.body.data?.status}`);
  const drv = await BusDriver.findOne({ phone: NEW_DRIVER }).lean();
  check('bus driver account auto-created, pending', drv && drv.status === 'pending' && drv.approve === false, JSON.stringify({ status: drv?.status, approve: drv?.approve }));

  console.log('\n--- BUS DRIVER while bus is pending');
  const D = await login(NEW_DRIVER, 'bus_driver');
  check('pending bus driver can log in', !!D);
  const meP = await req('GET', '/drivers/me', undefined, D);
  check('pending driver sees profile + bus', meP.status === 200 && meP.body.data?.busService?.busName === 'E2E Test Bus', `status=${meP.body.data?.status}`);
  const seatsP = await req('GET', `/drivers/bus/seats?scheduleId=sched-e2e&date=${dateKey()}`, undefined, D);
  check('pending driver blocked from seat desk (403)', seatsP.status === 403, `status=${seatsP.status}`);
  const bookP = await req('GET', `/drivers/bus/bookings?scheduleId=sched-e2e&date=${dateKey()}`, undefined, D);
  check('pending driver blocked from bookings (403)', bookP.status === 403, `status=${bookP.status}`);

  console.log('\n--- duplicate / validation rules');
  const dup = await req('POST', '/drivers/fleet/bus-services', newBusPayload({ registrationNumber: 'MP00E2E0002', driverPhone: '9000000007', driverName: 'Test Bus Driver' }), O);
  check('same driver phone on 2nd bus rejected (409)', dup.status === 409, `status=${dup.status} ${dup.body.message || ''}`);
  const leftover = await BusService.countDocuments({ registrationNumber: 'MP00E2E0002' });
  check('rejected bus not left behind in DB', leftover === 0, `count=${leftover}`);
  const noName = await req('POST', '/drivers/fleet/bus-services', newBusPayload({ busName: '', registrationNumber: 'MP00E2E0003', driverPhone: '9000000012' }), O);
  check('missing bus name rejected (400)', noName.status === 400, `status=${noName.status}`);
  const half = await req('POST', '/drivers/fleet/bus-services', newBusPayload({ registrationNumber: 'MP00E2E0004', driverPhone: '', driverName: 'No Phone' }), O);
  check('driver name without phone rejected (400)', half.status === 400, `status=${half.status}`);
  await BusService.deleteMany({ registrationNumber: { $in: ['MP00E2E0002', 'MP00E2E0003', 'MP00E2E0004'] } });

  console.log('\n--- admin approves');
  await approveBusService(busId);
  const drv2 = await BusDriver.findOne({ phone: NEW_DRIVER }).lean();
  check('approving bus approves its driver', drv2?.status === 'approved' && drv2?.approve === true, `status=${drv2?.status}`);
  const seatsA = await req('GET', `/drivers/bus/seats?scheduleId=sched-e2e&date=${dateKey(1)}`, undefined, D);
  const cells = (seatsA.body.data?.blueprint?.lowerDeck || []).flat().filter((c) => c.kind === 'seat');
  check('approved driver gets seat layout', seatsA.status === 200 && cells.length === 12, `seats=${cells.length}`);
  const w = cells.find((c) => c.label === '1A');
  const a = cells.find((c) => c.label === '1B');
  check('window seat price 350, aisle 300', w?.price === 350 && a?.price === 300, `1A=${w?.price} 1B=${a?.price}`);

  console.log('\n--- BUS DRIVER: desk booking');
  const tomorrow = dateKey(1);
  const res1 = await req('POST', '/drivers/bus/reservations', { scheduleId: 'sched-e2e', travelDate: tomorrow, seatIds: ['1A', '1B'], passenger: { name: 'Eetoo Passenger', phone: '9822200055', age: 31, gender: 'male' } }, D);
  check('desk booking 1A+1B -> 201, amount 650', res1.status === 201 && res1.body.data?.amount === 650, `status=${res1.status} amount=${res1.body.data?.amount} ${res1.body.message || ''}`);
  const bookingId = res1.body.data?.id;
  const res2 = await req('POST', '/drivers/bus/reservations', { scheduleId: 'sched-e2e', travelDate: tomorrow, seatIds: ['1A'], passenger: { name: 'Dup', phone: '9822200056', age: 31, gender: 'male' } }, D);
  check('same seat again rejected (409)', res2.status === 409, `status=${res2.status}`);
  const bad1 = await req('POST', '/drivers/bus/reservations', { scheduleId: 'sched-e2e', travelDate: tomorrow, seatIds: ['2A'], passenger: { name: 'X', phone: '123', age: 31, gender: 'male' } }, D);
  check('bad passenger phone rejected (400)', bad1.status === 400, `status=${bad1.status}`);
  const bad2 = await req('POST', '/drivers/bus/reservations', { scheduleId: 'sched-e2e', travelDate: tomorrow, seatIds: ['9Z'], passenger: { name: 'Valid Name', phone: '9822200057', age: 31, gender: 'male' } }, D);
  check('non-existent seat rejected', bad2.status >= 400 && bad2.status < 500, `status=${bad2.status} ${bad2.body.message || ''}`);
  const bad3 = await req('POST', '/drivers/bus/reservations', { scheduleId: 'nope', travelDate: tomorrow, seatIds: ['2A'], passenger: { name: 'Valid Name', phone: '9822200057', age: 31, gender: 'male' } }, D);
  check('unknown schedule rejected', bad3.status >= 400 && bad3.status < 500, `status=${bad3.status}`);
  const seatsB = await req('GET', `/drivers/bus/seats?scheduleId=sched-e2e&date=${tomorrow}`, undefined, D);
  const booked = (seatsB.body.data?.blueprint?.lowerDeck || []).flat().filter((c) => c.status === 'booked').map((c) => c.label);
  check('layout shows 1A,1B booked', booked.includes('1A') && booked.includes('1B') && seatsB.body.data?.availableSeats === 10, `booked=${booked} free=${seatsB.body.data?.availableSeats}`);
  const mine = await req('GET', `/drivers/bus/bookings?scheduleId=sched-e2e&date=${tomorrow}`, undefined, D);
  check('driver sees the booking', (mine.body.results || []).some((x) => x.id === bookingId), `n=${(mine.body.results || []).length}`);
  const meD = await req('GET', '/drivers/me', undefined, D);
  const sum = (meD.body.data?.tripSummary || []).find((r) => r.travelDate === tomorrow);
  check('profile tripSummary counts 2 seats', sum?.seats === 2 && sum?.bookings === 1, JSON.stringify(sum));

  console.log('\n--- OWNER sees + cancels it');
  const ob = await req('GET', `/drivers/fleet/bus-bookings?busServiceId=${busId}`, undefined, O);
  const found = (ob.body.data?.results || ob.body.results || ob.body.data || []);
  const foundArr = Array.isArray(found) ? found : found.bookings || [];
  check('owner sees the desk booking', foundArr.some((x) => String(x.id || x._id) === bookingId), `n=${foundArr.length}`);
  const cancel = await req('POST', `/drivers/fleet/bus-bookings/${bookingId}/cancel`, { seatIds: ['1B'], notes: 'e2e test' }, O);
  check('owner cancels one seat', cancel.status === 200, `status=${cancel.status} ${cancel.body.message || ''}`);
  const seatsC = await req('GET', `/drivers/bus/seats?scheduleId=sched-e2e&date=${tomorrow}`, undefined, D);
  const bookedC = (seatsC.body.data?.blueprint?.lowerDeck || []).flat().filter((c) => c.status === 'booked').map((c) => c.label);
  check('cancelled seat 1B becomes free again', !bookedC.includes('1B') && bookedC.includes('1A'), `booked=${bookedC}`);
  const stranger = await login('9000000007', 'bus_driver');
  const forbidden = await req('GET', `/drivers/bus/bookings?scheduleId=sched-e2e&date=${tomorrow}`, undefined, stranger);
  check("other bus's driver cannot see this bus's passengers", (forbidden.body.results || []).length === 0, `n=${(forbidden.body.results || []).length}`);

  console.log('\n--- roles / permissions');
  const driverTokenOnOwnerRoute = await req('GET', '/drivers/fleet/wallet', undefined, D);
  check('bus driver cannot open owner wallet (403)', driverTokenOnOwnerRoute.status === 403, `status=${driverTokenOnOwnerRoute.status}`);
  const busDriverOnFleetDrivers = await req('GET', '/drivers/fleet/drivers', undefined, D);
  check('bus driver cannot list fleet drivers (403)', busDriverOnFleetDrivers.status === 403, `status=${busDriverOnFleetDrivers.status}`);
  const ownerOnDesk = await req('GET', `/drivers/bus/seats?scheduleId=sched-e2e&date=${tomorrow}`, undefined, O);
  check('owner cannot use driver seat desk (403)', ownerOnDesk.status === 403, `status=${ownerOnDesk.status}`);
  const noToken = await req('GET', '/drivers/me');
  check('no token -> 401', noToken.status === 401, `status=${noToken.status}`);
  console.log('\n--- owner cannot tamper with admin-only fields');
  const demoBus = await BusService.findOne({ registrationNumber: 'MP09TB1001' }).lean();
  const demoDriver = await BusDriver.findById(demoBus.busDriverId).lean();
  const before = await BusService.findById(busId).lean();
  const t1 = await req('PATCH', `/drivers/fleet/bus-services/${busId}`, newBusPayload({ status: 'rejected', serviceTaxPercentage: 77, rejectionReason: 'hacked', busDriverId: String(demoDriver._id), ownerId: String(demoBus._id) }), O);
  const after = await BusService.findById(busId).lean();
  check('owner edit of own bus works', t1.status === 200, `status=${t1.status} ${t1.body.message || ''}`);
  check("owner cannot change the bus's approval status", after.status === 'active', `status=${after.status}`);
  check('owner cannot set service tax', (after.serviceTaxPercentage || 0) === (before.serviceTaxPercentage || 0), `tax=${after.serviceTaxPercentage}`);
  check('owner cannot set rejection reason', !after.rejectionReason, `reason=${after.rejectionReason}`);
  check('busDriverId from owner ignored (other bus driver untouched)', String(after.busDriverId) === String(before.busDriverId), `busDriverId=${after.busDriverId}`);
  const demoDriverAfter = await BusDriver.findById(demoDriver._id).lean();
  check("other bus's driver record not hijacked", demoDriverAfter.name === demoDriver.name && String(demoDriverAfter.assignedBusServiceId) === String(demoDriver.assignedBusServiceId), `${demoDriverAfter.name} -> ${demoDriverAfter.assignedBusServiceId}`);
  await BusService.updateOne({ _id: busId }, { $set: { status: 'suspended' } });
  await req('PATCH', `/drivers/fleet/bus-services/${busId}`, newBusPayload({ status: 'active' }), O);
  const susp = await BusService.findById(busId).lean();
  check('owner cannot re-activate a suspended bus', susp.status === 'suspended', `status=${susp.status}`);
  await BusService.updateOne({ _id: busId }, { $set: { status: 'active' } });
  const ghost = await req('PATCH', `/drivers/fleet/bus-services/${new mongoose.Types.ObjectId()}`, newBusPayload(), O);
  check('editing a bus that is not yours -> 404', ghost.status === 404, `status=${ghost.status}`);

  console.log('\n--- owner changes the driver of a bus');
  const swap = await req('PATCH', `/drivers/fleet/bus-services/${busId}`, newBusPayload({ driverName: 'Second Driver', driverPhone: '9000000013' }), O);
  check('driver phone change accepted', swap.status === 200, `status=${swap.status} ${swap.body.message || ''}`);
  const oldDrv = await BusDriver.findOne({ phone: NEW_DRIVER }).lean();
  const newDrv = await BusDriver.findOne({ phone: '9000000013' }).lean();
  check('old driver detached from bus', !oldDrv || String(oldDrv.assignedBusServiceId || '') !== busId, `old exists=${!!oldDrv} assigned=${oldDrv?.assignedBusServiceId || ''}`);
  check('new driver attached', newDrv && String(newDrv.assignedBusServiceId) === busId, `${newDrv?.name}`);

  console.log('\n--- owner deletes a bus that has a live booking');
  const del1 = await req('DELETE', `/drivers/fleet/bus-services/${busId}`, undefined, O);
  check('delete refused while a booking is live (409)', del1.status === 409, `status=${del1.status} ${del1.body.message || ''}`);
  const stillBus = await BusService.countDocuments({ _id: busId });
  check('bus still exists after refused delete', stillBus === 1, `count=${stillBus}`);
  const cancelLast = await req('POST', `/drivers/fleet/bus-bookings/${bookingId}/cancel`, { seatIds: ['1A'], notes: 'e2e cleanup' }, O);
  check('owner cancels the remaining seat', cancelLast.status === 200, `status=${cancelLast.status} ${cancelLast.body.message || ''}`);
  const del2 = await req('DELETE', `/drivers/fleet/bus-services/${busId}`, undefined, O);
  check('delete works once no live booking is left', del2.status === 200, `status=${del2.status} ${del2.body.message || ''}`);
  const driverGone = await BusDriver.countDocuments({ phone: '9000000013' });
  check("bus driver account removed with the bus", driverGone === 0, `count=${driverGone}`);
} catch (e) {
  console.log('SCRIPT ERROR', e);
} finally {
  // cleanup everything this test created
  const b = await BusService.find({ registrationNumber: { $regex: '^MP00E2E' } });
  for (const x of b) {
    await BusBooking.deleteMany({ busServiceId: x._id });
    await BusSeatHold.deleteMany({ busServiceId: x._id });
    await TripSeatInventory.deleteMany({ busServiceId: x._id });
    await BusService.deleteOne({ _id: x._id });
  }
  await BusBooking.deleteMany({ 'passenger.name': { $in: ['Eetoo Passenger', 'Dup'] } });
  await BusDriver.deleteMany({ phone: { $in: [NEW_DRIVER, '9000000013', '9000000012'] } });
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed`);
  failed.forEach((f) => console.log('  FAILED:', f.name));
  await mongoose.disconnect();
}
