import mongoose from "mongoose";
const { Schema } = mongoose;

const AddressSchema = new Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAuth',
    required: true,
    index: true,
  },
}, { timestamps: true });

// Index for efficient querying by user
AddressSchema.index({ user: 1, isDefault: 1 });

//export the Address model
const Address = mongoose.model('Address', AddressSchema);
export default Address; // ✅ Use ESM export