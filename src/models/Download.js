const mongoose = require('mongoose');
const { Schema } = mongoose;

const DownloadSchema = new Schema({
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
  mediaVariantId: {
    type: Schema.Types.ObjectId,
    ref: 'MediaVariant',
    required: true,
  },
  downloadUrl: {
    type: String,
    required: true, // Presigned URL or S3 path for the downloaded file
  },
  resolution: {
    type: String,
    enum: ['240p', '480p', '720p', '1080p', '4K'],
    required: true,
  },
  fileSize: {
    type: Number, // In bytes
    required: true,
  },
  expiresAt: {
    type: Date, // When the download URL expires
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Unique index to prevent duplicate downloads for the same user, media, and variant
DownloadSchema.index({ userId: 1, mediaId: 1, mediaVariantId: 1 }, { unique: true });

module.exports = mongoose.model('Download', DownloadSchema);