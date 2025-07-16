const mongoose = require('mongoose')

const SessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'UserAuth',
        required: true
    },
    deviceInfo: {
        type: Object,
        default: {}
    },
    token: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    ipAddress: {
        type: String
    },
    location: {
        type: Object,
        default: {}
    }

},{timestamps:true});

module.exports = mongoose.model('Session',SessionSchema);