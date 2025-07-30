import mongoose from "mongoose";
const { Schema } = mongoose;

const AddressSchema = new Schema({
  street: { type: String, required: true },        // "123 Main St"
  street2: { type: String },                       // "Apt 4B", optional
  landmark: { type: String },                      // "Near Central Park", optional
  city: { type: String, required: true },
  state: {
    type: String,
    required: true,
    uppercase: true,
    match: [/^[A-Z]{2}$/, 'State should be a 2-letter abbreviation']
  },
  postalCode: {
    type: String,
    required: true,
    match: [/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format']
  },
  country: { type: String, required: true, default: "USA" },
  phoneNumber: {
    type: String,
    required: true,
    match: [/^\+?1?\d{10,15}$/, 'Invalid phone number']
  },
  deliveryInstructions: { type: String },          // Optional delivery notes
  isDefault: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAuth',
    required: true,
    index: true,
  },
}, { timestamps: true });

const Address = mongoose.model('Address', AddressSchema);
export default Address;
