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
    tags: [{ type: String }],
    pipelineStage: {
      type: String,
      enum: ["Lead", "Contacted", "Qualified", "Proposal", "Closed Won", "Closed Lost"],
      default: "Lead",
    },
    deal: {
      value:     { type: Number, default: 0 },
      currency:  { type: String, default: "USD" },
      closeDate: { type: Date },
      notes:     { type: String },
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
