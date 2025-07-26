// const mongoose = require('mongoose')
// const { Schema } = mongoose;
import mongoose from 'mongoose';
const { Schema } = mongoose;

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

const Session = mongoose.model('Session', SessionSchema);
export default Session; // ✅ Use ESM export