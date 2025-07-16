const mongoose = require('mongoose');
const { Schema } = mongoose;

// playlist can be created by admin user and artist as well
// but only the user who created the playlist can modify it
// playlist can be public, private or unlisted
// public playlists can be accessed by anyone
// private playlists can only be accessed by the user who created it
// unlisted playlists can be accessed by anyone with the link but not listed publicly
// playlists can contain media items, which can be songs, albums, or artists
// playlists can be updated, deleted, and media items can be added or removed
// playlists can be searched by name, description, and visibility
// playlists can be sorted by name, date created, and visibility

const PlaylistSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'UserAuth',
    required: true,
  },
  thumbnailUrl: {
    type: String,
    default: '',
  },
  creatorType: {
    type: String,
    enum: ['user', 'admin', 'artist'],
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'private',
  },
  mediaItems: [{
    type: Schema.Types.ObjectId,
    ref: 'Media',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Index for efficient querying by user and visibility
PlaylistSchema.index({ userId: 1, visibility: 1 });

module.exports = mongoose.model('Playlist', PlaylistSchema);