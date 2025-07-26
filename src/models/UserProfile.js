// const mongoose = require('mongoose')
// const { Schema } = mongoose;
import mongoose from 'mongoose';
const { Schema } = mongoose;

const UserProfileSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserAuth',
        required: true,
        unique: true
    },
    bio: {
        type: String,
        default: ''
    },
    avatarUrl: {
        type: String,
        default: ''
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    status : {
        type: String,
        enum: ['active','deactivated','suspended','deleted'],
        default: 'active'
    },
    role: {
        type: String,
        enum: ['user','admin','artist'],
        default: 'user'
    },
    subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
    },
    preferences: {
        type: Object,
        default: {}
    },
    language: {
        type: String,
        default: 'en'
    },
    theme: {
        type: String,
        enum: ['light','dark'], 
        default: 'dark'
    },
    socialLinks: {
        type: Object,
        default: {}
    }
},{timestamps:true});

const UserProfile = mongoose.model("UserProfile", UserProfileSchema);

export default UserProfile; // ✅ Use ESM export