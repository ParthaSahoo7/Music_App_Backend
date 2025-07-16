const mongoose = require('mongoose');
const { Schema } = mongoose;
const UserFollowArtistSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'UserAuth',
    required: true,
    index: true,
  },
  artistId: {
    type: Schema.Types.ObjectId,
    ref: 'Artist',
    required: true,
    index: true,
  },
  followedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });   
// Unique index to prevent duplicate follows
UserFollowArtistSchema.index({ userId: 1, artistId: 1 }, { unique: true });
module.exports = mongoose.model('UserFollowArtist', UserFollowArtistSchema);