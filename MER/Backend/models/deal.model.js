import mongoose from "mongoose";

const dealSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    value: { type: Number, default: 0 },
    stage: {
      type: String,
      enum: ["New", "Qualified", "Proposal", "Won", "Lost"],
      default: "New",
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    contactName: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    assignedTo: { type: String, default: "" },
    notes: { type: String, default: "" },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Deal", dealSchema);
