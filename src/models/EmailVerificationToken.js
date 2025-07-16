// models/EmailVerificationToken.js
const mongoose = require('mongoose');

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

module.exports = mongoose.model('EmailVerificationToken', EmailVerificationTokenSchema);
