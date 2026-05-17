import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sgMail from "@sendgrid/mail";
import Admin from "../models/admin.model.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (await Admin.findOne({ email }))
      return res.status(400).json({ error: "Email already in use" });
    const admin = await Admin.create({ name, email, password });
    const token = signToken(admin._id);
    res.status(201).json({ token, admin: { id: admin._id, name: admin.name, email: admin.email } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.comparePassword(password)))
      return res.status(401).json({ error: "Invalid email or password" });
    const token = signToken(admin._id);
    res.json({ token, admin: { id: admin._id, name: admin.name, email: admin.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/me", protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select("-password");
    if (!admin) return res.status(404).json({ error: "Not found" });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8)
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    const admin = await Admin.findById(req.admin.id);
    if (!(await admin.comparePassword(currentPassword)))
      return res.status(401).json({ error: "Current password is incorrect" });
    admin.password = newPassword;
    await admin.save();
    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });
    // Always respond OK to prevent email enumeration
    if (!admin) return res.json({ message: "If that email exists, a reset link was sent." });

    const rawToken = crypto.randomBytes(32).toString("hex");
    admin.resetToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    admin.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await admin.save();

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;
    await sgMail.send({
      to: admin.email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "Reset your AeroBase password",
      html: `
        <h2>Password reset</h2>
        <p>You requested a password reset for your AeroBase admin account.</p>
        <p><a href="${resetUrl}" style="background:#aa3bff;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Reset password</a></p>
        <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      `,
    });
    res.json({ message: "If that email exists, a reset link was sent." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/reset-password/:token", async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8)
      return res.status(400).json({ error: "Password must be at least 8 characters" });

    const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const admin = await Admin.findOne({
      resetToken: hashed,
      resetTokenExpiry: { $gt: new Date() },
    });
    if (!admin) return res.status(400).json({ error: "Reset link is invalid or expired" });

    admin.password = newPassword;
    admin.resetToken = null;
    admin.resetTokenExpiry = null;
    await admin.save();
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admins", protect, async (req, res) => {
  try {
    const admins = await Admin.find().select("-password").sort({ createdAt: -1 });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/admins/:id", protect, async (req, res) => {
  try {
    if (req.params.id === req.admin.id)
      return res.status(400).json({ error: "Cannot delete your own account" });
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    res.json({ message: "Admin deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
