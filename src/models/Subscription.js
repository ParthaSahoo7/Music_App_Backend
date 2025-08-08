import mongoose from 'mongoose';
const { Schema } = mongoose;

const SubscriptionSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: ['Free', 'Premium', 'Premium+'],
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true,
        default: 'USD',
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    features: [{
        type: String,
        trim: true
    }],
    durationMonths: {
        type: Number,
        required: true,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    stripePriceId: {
        type: String,
        required: function() { return this.name !== 'Free'; }
    }
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', SubscriptionSchema);

export default Subscription;