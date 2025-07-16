const mongoose = require('mongoose')

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

module.exports = mongoose.model('OTPVerification', OTPVerificationSchema);