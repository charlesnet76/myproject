import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Open", "InProgress", "Resolved", "Closed"],
      default: "Open",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    contactName: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    assignedTo: { type: String, default: "" },
    resolution: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Ticket", ticketSchema);
