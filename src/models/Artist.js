// const mongoose = require('mongoose');
// const { Schema } = mongoose;
import mongoose from 'mongoose';
const { Schema } = mongoose;
const ArtistSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  bio: {
    type: String,
    trim: true,
  },
  profilePicture: {
    type: String, 
    trim: true,
  },
  socialLinks: {
    type: Map,
    of: String, 
  },
  media:{
    type: [Schema.Types.ObjectId], 
    ref: 'Media', 
    default: [],
  },
  genres: {
    type: [String], 
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true, 
  },
}, { timestamps: true });   

ArtistSchema.index({ name: 1 }, { unique: true });  

const Artist = mongoose.model('Artist', ArtistSchema);
export default Artist; // ✅ Use ESM export
