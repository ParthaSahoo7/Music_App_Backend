// const mongoose = require('mongoose');
// const { Schema } = mongoose;
import mongoose from 'mongoose';
const { Schema } = mongoose;
const MediaVariantSchema = new Schema({
  mediaId: {
    type: Schema.Types.ObjectId,
    ref: 'Media',
    required: true,
  },
  resolution: {
    type: String,
    enum: ['240p', '480p', '720p', '1080p','1440p', '4K'],
    required: true,
  },
  streamUrl: { type: String, required: true },
  fileSize: { type: Number },
  bitrate: { type: Number },
  format: {
    type: String,
    enum: ['hls', 'dash', 'mp4'],
    default: 'hls',
  },
}, { timestamps: true });

const MediaVariant = mongoose.model('MediaVariant', MediaVariantSchema);
export default MediaVariant; // ✅ Use ESM export