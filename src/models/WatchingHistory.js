// const mongoose = require('mongoose');
// const { Schema } = mongoose;
import mongoose from 'mongoose';
const { Schema } = mongoose;

const WatchingHistorySchema = new Schema({
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
  lastWatchedPosition: {
    type: Number,
    required: true,
    min: 0, // In seconds
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  lastWatchedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Unique index to prevent duplicate entries for the same user and media
WatchingHistorySchema.index({ userId: 1, mediaId: 1 }, { unique: true });

const WatchingHistory = mongoose.model('WatchingHistory', WatchingHistorySchema);
export default WatchingHistory; // ✅ Use ESM export