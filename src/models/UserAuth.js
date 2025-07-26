// === src/models/UserAuth.js ===

// const mongoose = require('mongoose');
// const argon2 = require('argon2');
import mongoose from 'mongoose';
import argon2 from 'argon2';

const UserAuthSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      required: true,
      trim: true
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'artist'],
      default: 'user'
    },
    countryCode: String,
    phoneNumber: String,
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isDeactivated: {
      type: Boolean,
      default: false,
    },
    isBan: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

// 🔐 Hash password before saving
UserAuthSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await argon2.hash(this.password);
    next();
  } catch (err) {
    next(err);
  }
});

// 🔍 Method to verify password
UserAuthSchema.methods.matchPassword = async function (enteredPassword) {
  try {
    return await argon2.verify(this.password, enteredPassword);
  } catch (error) {
    return false;
  }
};

const UserAuth = mongoose.model('UserAuth', UserAuthSchema);
export default UserAuth; // ✅ Use ESM export
