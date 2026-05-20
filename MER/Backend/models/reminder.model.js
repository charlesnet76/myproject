import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  adminName: { type: String, required: true },
  note:      { type: String, required: true },
  dueAt:     { type: Date, required: true },
  done:      { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Reminder", reminderSchema);
