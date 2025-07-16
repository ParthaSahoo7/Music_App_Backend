const mongoose = require('mongoose');
const { Schema } = mongoose;

const FavouriteSchema = new Schema({
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

// Unique index to prevent duplicate favorites
FavouriteSchema.index({ userId: 1, mediaId: 1 }, { unique: true });

module.exports = mongoose.model('Favourite', FavouriteSchema);