const mongoose = require('mongoose');
const { Schema } = mongoose;

const MediaSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: {
    type: String,
    enum: ['movie', 'music', 'podcast'],
    required: true,
  },
  thumbnailUrl: { type: String },
  mediaUrl: { type: String },
  s3KeyOriginal: { type: String },
  uploadId: { type: String }, // Added for multipart upload
  duration: { type: Number },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAuth',
    required: true,
    index: true,
  },
  uploaderType: {
    type: String,
    enum: ['artist', 'admin'],
    required: true,
  },
  genres: [{ type: String }],
  tags: [{ type: String }],
  releaseDate: { type: Date },
  language: { type: String },
  ageRating: { type: String },
  isActive: { type: Boolean, default: true },
  visibility: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public',
  },
  isPublished: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  transcodingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  mediaConvertJobId: { type: String },
  captionsUrl: { type: String },
  views: { type: Number, default: 0 },
  likeCount: { type: Number, default: 0 },
  dislikeCount: { type: Number, default: 0 },
  sharesCount: { type: Number, default: 0 },
}, { timestamps: true });

// Index for efficient querying by uploadedBy and visibility
MediaSchema.index({ uploadedBy: 1, visibility: 1 });

module.exports = mongoose.model('Media', MediaSchema);