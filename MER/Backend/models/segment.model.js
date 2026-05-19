import mongoose from "mongoose";

const filterSchema = new mongoose.Schema(
  {
    field: { type: String },
    operator: { type: String },
    value: { type: String },
  },
  { _id: false }
);

const segmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    color: { type: String, default: "#3b82f6" },
    filters: { type: [filterSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Segment", segmentSchema);
