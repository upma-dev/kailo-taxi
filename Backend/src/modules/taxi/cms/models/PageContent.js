import mongoose from 'mongoose';

const featureSchema = new mongoose.Schema(
  {
    icon: { type: String, default: 'Heart' },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    color: { type: String, default: '' },
    bgColor: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const legalPageSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    intro: { type: String, default: '' }, // short summary shown in the highlighted box at the top
    content: { type: String, default: '' }, // stored as HTML string (visible sections only)
    published: { type: Boolean, default: true }, // off => the apps show "not available"
    showUpdated: { type: Boolean, default: true }, // show the "Last updated" line
    sections: { type: [mongoose.Schema.Types.Mixed], default: undefined }, // editor copy: { heading, body, hidden }
  },
  { _id: false },
);

const aboutPageSchema = new mongoose.Schema(
  {
    appName: { type: String, default: 'Kailo Taxi' },
    version: { type: String, default: '1.0.0' },
    description: { type: String, default: '' },
    logo: { type: String, default: '' },
    features: { type: [featureSchema], default: [] },
    stats: { type: Array, default: [] },
  },
  { _id: false },
);

export const PAGE_CONTENT_KEYS = [
  'terms',
  'driver-terms',
  'privacy',
  'driver-privacy',
  'refund',
  'shipping',
  'cancellation',
  'dmv-compliance',
  'about',
  'home',
  'landing',
];

const pageContentSchema = new mongoose.Schema(
  {
    // Legal pages use free-form keys (<app>-<document>) so the admin can add apps and documents; validated in the service.
    key: { type: String, required: true, unique: true, index: true },
    legal: { type: legalPageSchema, default: undefined },
    about: { type: aboutPageSchema, default: undefined },
    home: { type: mongoose.Schema.Types.Mixed, default: undefined },
    landing: { type: mongoose.Schema.Types.Mixed, default: undefined },
    meta: { type: mongoose.Schema.Types.Mixed, default: undefined }, // legal-index: apps + document types the admin manages
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedByRole: { type: String, default: 'ADMIN' },
  },
  // Collection name kept so CMS content saved before the rename is still served.
  { collection: 'food_page_contents', timestamps: true },
);

export const PageContent = mongoose.models.PageContent || mongoose.model('PageContent', pageContentSchema);
