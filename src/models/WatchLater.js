// const mongoose = require('mongoose');
// const { Schema } = mongoose;
import mongoose from 'mongoose';
const { Schema } = mongoose;

const WatchLaterSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'UserAuth',
    required: true,
    index: true,
  },
  mediaId: {
    type: Schema.Types.ObjectId,
    ref: 'Media',
    required: true,
    index: true,
  },
}, { timestamps: true });

// Unique index to prevent duplicate watch later entries
WatchLaterSchema.index({ userId: 1, mediaId: 1 }, { unique: true });

const WatchLater = mongoose.model('WatchLater', WatchLaterSchema);
export default WatchLater; // ✅ Use ESM export