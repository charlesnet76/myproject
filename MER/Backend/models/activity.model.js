import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    action:     { type: String, required: true },
    adminName:  { type: String, required: true },
    targetName: { type: String, default: "" },
    detail:     { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("ActivityLog", activitySchema);
