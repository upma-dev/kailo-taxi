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
    content: { type: String, default: '' }, // stored as HTML string
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
];

const pageContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true, enum: PAGE_CONTENT_KEYS },
    legal: { type: legalPageSchema, default: undefined },
    about: { type: aboutPageSchema, default: undefined },
    home: { type: mongoose.Schema.Types.Mixed, default: undefined },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedByRole: { type: String, default: 'ADMIN' },
  },
  // Collection name kept so CMS content saved before the rename is still served.
  { collection: 'food_page_contents', timestamps: true },
);

export const PageContent = mongoose.models.PageContent || mongoose.model('PageContent', pageContentSchema);
