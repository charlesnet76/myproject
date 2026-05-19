import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    ip_address: { type: String },
    status:     { type: String, enum: ['Active', 'Inactive', 'Banned'], default: 'Active' },
    photo: { type: String, default: null },
    lastActivity: { type: Date, default: null },
    tags:         [{ type: String }],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
