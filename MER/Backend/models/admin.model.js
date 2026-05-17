import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema(
  {
    name:              { type: String, required: true },
    email:             { type: String, required: true, unique: true },
    password:          { type: String, required: true },
    resetToken:        { type: String, default: null },
    resetTokenExpiry:  { type: Date,   default: null },
  },
  { timestamps: true }
);

adminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

adminSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
