import mongoose from 'mongoose';

// Small one-time flags for the admin module (for example "the default App Modules were already created"),
// so something the admin deletes later is never created again.
const adminMetaSchema = new mongoose.Schema({ key: { type: String, required: true, unique: true } }, { timestamps: true });

export const AdminMeta = mongoose.models.TaxiAdminMeta || mongoose.model('TaxiAdminMeta', adminMetaSchema);
