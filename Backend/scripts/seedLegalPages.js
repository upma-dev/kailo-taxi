// Writes the Rider app and Website policies into the CMS so the admin can edit them in Admin > Legal Pages.
//
//   node scripts/seedLegalPages.js            # only fills pages the admin has not saved yet
//   node scripts/seedLegalPages.js --force    # overwrites them
import 'dotenv/config';
import mongoose from 'mongoose';
import { PageContent } from '../src/modules/taxi/cms/models/PageContent.js';
import { upsertLegalPage } from '../src/modules/taxi/cms/services/pageContentService.js';

const force = process.argv.includes('--force');
const BRAND = 'Kailo Taxi';

// [heading, paragraph | [bullets]] per section. Numbers are added automatically on the page.
const DOCS = {
  privacy: {
    title: (a) => `${a.name} Privacy Policy`,
    intro: (a) => `${BRAND} values your privacy. This policy explains what we collect when you use the ${a.where}, and how we use and protect it.`,
    sections: (a) => [
      ['Information we collect', ['Your name, phone number and email address.', `Saved addresses and, while you use the ${a.where}, your device location.`, 'Trip, payment and support history.']],
      ['How we use your information', `We use your details to book and complete rides, parcels and rentals, to match you with nearby drivers, to process payments, to keep trips safe and to improve ${BRAND}.`],
      ['Location data', 'Location is used only to find your pickup point, match drivers and show trip progress. You can turn location off in your device settings, but booking may not work without it.'],
      ['Sharing your information', 'Your driver sees your name, pickup and drop points. Phone numbers are masked during calls. We do not sell your personal information. We share data only with payment, SMS and mapping partners that help run the service, or when the law requires it.'],
      ['Data security and retention', 'We protect your data with encryption and access controls. We keep it only as long as needed to provide the service and meet legal requirements.'],
      ['Your choices', ['Update your details from your profile.', 'Request deletion of your account from Profile > Delete Account.', 'Opt out of promotional messages at any time.']],
      ['Contact us', 'For privacy questions, reach our support team through Help & Support.'],
    ],
  },
  terms: {
    title: (a) => `${a.name} Terms & Conditions`,
    intro: () => `Please read these Terms carefully before using ${BRAND}. By creating an account or booking a service you agree to them.`,
    sections: () => [
      [`About ${BRAND}`, `${BRAND} is a platform that connects riders with independent drivers for city rides, parcel delivery, rentals, bus and intercity trips. The trip itself is carried out by the driver.`],
      ['Eligibility and your account', ['You must be at least 18 years old.', 'Give accurate details and keep them up to date.', 'Keep your login details and OTP private. You are responsible for activity on your account.']],
      ['Booking a service', 'Fares and estimated arrival times are shown before you confirm. A booking is confirmed once a driver accepts it.'],
      ['Pricing, fees and taxes', 'You pay the fare shown plus any applicable tolls, waiting charges and taxes. Final charges may change if the route or waiting time changes.'],
      ['Payments', 'You can pay by cash, UPI, card or wallet where available. Payments are processed securely by our payment partners.'],
      ['Cancellations and refunds', 'Cancellation charges and refunds follow our Cancellation Policy and Refund Policy.'],
      ['Safe and respectful use', ['Treat drivers and other riders with respect.', 'Do not carry illegal or dangerous items.', 'Do not misuse offers, referrals or the platform.']],
      ['Suspension', 'We may suspend or close an account for fraud, abuse or breach of these Terms.'],
      ['Changes to these Terms', 'We may update these Terms. Continued use after an update means you accept it.'],
      ['Governing law and contact', 'These Terms are governed by the laws of India. For questions or complaints, contact us through Help & Support.'],
    ],
  },
  refund: {
    title: () => 'Refund Policy',
    intro: () => `How and when you get your money back on ${BRAND}.`,
    sections: () => [
      ['When you get a refund', 'Rides canceled before a driver is assigned, or because no driver is available, are refunded in full to the original payment method.'],
      ['How long it takes', 'Refunds reach your bank, card or UPI account within 3-5 business days.'],
      ['Wallet payments', 'If you paid from your wallet, the amount is returned to your wallet straight away.'],
      ['Overcharges', 'If you were charged more than the fare shown, report it from the trip details and we will review it.'],
      ['Need help?', 'If a refund has not arrived in time, contact our support team from Help & Support.'],
    ],
  },
  cancellation: {
    title: () => 'Cancellation Policy',
    intro: () => 'What happens when a ride is canceled. Charges shown in the app always match the live settings.',
    sections: () => [
      ['Free cancellation', 'You can cancel for free until a driver is assigned.'],
      ['Cancellation charges', 'A cancellation charge applies as per the configured rules once a driver has been assigned. The exact amount is shown in the app before you confirm.'],
      ['Driver cancellations', 'If the driver cancels, you are not charged and we help you find another ride.'],
      ['Questions', 'Contact Help & Support if you believe a cancellation charge was applied by mistake.'],
    ],
  },
  shipping: {
    title: () => 'Parcel & Shipping Policy',
    intro: () => `How parcel pickup and delivery work on ${BRAND}.`,
    sections: () => [
      ['Pickup', 'Parcels are picked up by a nearby driver shortly after booking.'],
      ['Delivery time', 'The estimated delivery time is shown before you book, based on live traffic and distance.'],
      ['What you can send', 'Illegal, dangerous or restricted items cannot be sent. Describe the parcel contents correctly when booking.'],
      ['Damage or loss', 'If a parcel is damaged or lost, report it from the app and our team will review it.'],
    ],
  },
  'dmv-compliance': {
    title: () => 'DMV & Transport Compliance',
    intro: () => `The transport rules every driver and vehicle on ${BRAND} must follow.`,
    sections: () => [
      ['Licenses and permits', 'All drivers must hold a valid driving license and the permits required for their vehicle type.'],
      ['Vehicle registration and insurance', 'Every vehicle must have valid registration and insurance, and pass local fitness checks.'],
      ['Local regulations', 'Drivers and vehicles must follow the motor vehicle and transport authority rules of the city they operate in.'],
    ],
  },
};

const APPS = [
  { prefix: '', name: 'Rider App', where: 'Rider app' },
  { prefix: 'website-', name: 'Website', where: 'website' },
];

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = (sections) =>
  sections
    .map(([h, body]) => `<h2>${esc(h)}</h2>${Array.isArray(body) ? `<ul>${body.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : `<p>${esc(body)}</p>`}`)
    .join('');

// Same connection as the server (src/config/db.js): no dbName, so the URI's default database is used.
await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000, family: 4 });
console.log(`Database: ${mongoose.connection.name}`);

for (const app of APPS) {
  for (const [doc, d] of Object.entries(DOCS)) {
    const key = `${app.prefix}${doc}`;
    const existing = await PageContent.findOne({ key }).lean();
    if (existing?.legal?.content && !force) {
      console.log(`skip   ${key} (already saved)`);
      continue;
    }
    await upsertLegalPage(key, { title: d.title(app), intro: d.intro(app), content: html(d.sections(app)), published: true, showUpdated: true });
    console.log(`saved  ${key}`);
  }
}
await mongoose.disconnect();
