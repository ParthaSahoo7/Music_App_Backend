// const mongoose = require('mongoose')
import mongoose from 'mongoose';
// const { Schema } = mongoose;
const { Schema } = mongoose;

const OTPVerificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserAuth',
        required: true
    },
    method: {
        type: String,
        enum: ['email','phone'],
        required: true
    },
    otpCode: {
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
},{timestamps:true})

const OTPVerification = mongoose.model('OTPVerification', OTPVerificationSchema);
export default OTPVerification; // ✅ Use ESM export