const mongoose = require('mongoose');

const PasswordResetTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserAuth'
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
},{timestamps:true})

const PasswordResetToken = mongoose.model('PasswordResetToken', PasswordResetTokenSchema);

module.exports = PasswordResetToken;