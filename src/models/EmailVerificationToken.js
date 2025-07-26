// models/EmailVerificationToken.js
// const mongoose = require('mongoose');
import mongoose from 'mongoose';
// const { Schema } = mongoose;
const { Schema } = mongoose;

const EmailVerificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'UserAuth',
    unique: true
  },
  token: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isUsed: {
        type: Boolean,
        default: false
  }
});

const EmailVerificationToken = mongoose.model('EmailVerificationToken', EmailVerificationTokenSchema);
export default EmailVerificationToken; // ✅ Use ESM export
