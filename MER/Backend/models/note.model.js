import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text:      { type: String, required: true, maxlength: 1000 },
    adminName: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Note", noteSchema);
