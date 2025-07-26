// const mongoose = require('mongoose');
import mongoose from 'mongoose';
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

const Favourite = mongoose.model('Favourite', FavouriteSchema);
export default Favourite; // ✅ Use ESM export