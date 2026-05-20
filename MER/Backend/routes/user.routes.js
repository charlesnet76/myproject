import express from "express";
import multer from "multer";
import sgMail from "@sendgrid/mail";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";
import Note from "../models/note.model.js";
import Reminder from "../models/reminder.model.js";
import ActivityLog from "../models/activity.model.js";
import { protect } from "../middleware/auth.middleware.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = express.Router();
router.use(protect);

const SORT_FIELDS = new Set(["first_name", "last_name", "email", "createdAt", "lastActivity"]);

async function log(action, adminName, targetName = "", detail = "") {
  try { await ActivityLog.create({ action, adminName, targetName, detail }); } catch { /* best-effort */ }
}

// ── List ─────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const {
      page = 1, limit = 12, sort = "createdAt", order = "desc",
      search = "", gender = "", status = "",
    } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { first_name: { $regex: search, $options: "i" } },
        { last_name:  { $regex: search, $options: "i" } },
        { email:      { $regex: search, $options: "i" } },
      ];
    }
    if (gender && gender !== "All") filter.gender = gender;
    if (status && status !== "All") filter.status = status;

    const sortField = SORT_FIELDS.has(sort) ? sort : "createdAt";
    const sortDir   = order === "asc" ? 1 : -1;
    const pg  = Math.max(1, Number(page));
    const lim = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pg - 1) * lim;

    const [total, globalTotal, maleCount, femaleCount, otherCount, users] = await Promise.all([
      User.countDocuments(filter),
      User.countDocuments({}),
      User.countDocuments({ gender: "Male" }),
      User.countDocuments({ gender: "Female" }),
      User.countDocuments({ gender: "Other" }),
      User.find(filter).sort({ [sortField]: sortDir }).skip(skip).limit(lim),
    ]);

    res.json({
      users,
      total,
      page: pg,
      pages: Math.ceil(total / lim),
      stats: { total: globalTotal, male: maleCount, female: femaleCount, other: otherCount },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Pipeline ─────────────────────────────────────────────
router.get("/pipeline", async (req, res) => {
  try {
    const stages = ["Lead", "Contacted", "Qualified", "Proposal", "Closed Won", "Closed Lost"];
    const users = await User.find({}, "first_name last_name email photo pipelineStage deal tags status");
    const grouped = {};
    stages.forEach(s => (grouped[s] = []));
    users.forEach(u => {
      const stage = stages.includes(u.pipelineStage) ? u.pipelineStage : "Lead";
      grouped[stage].push(u);
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Export ───────────────────────────────────────────────
router.get("/export", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const cols = ["first_name", "last_name", "email", "gender", "ip_address", "status", "lastActivity", "createdAt"];
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = users.map((u) => cols.map((c) => escape(u[c])).join(","));
    const csv = [cols.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="aerobase-users.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Single ────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create ────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const user = await User.create(req.body);
    log("created", req.admin.name || "Admin", `${user.first_name} ${user.last_name}`);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Bulk import ───────────────────────────────────────────
router.post("/bulk", async (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users)) return res.status(400).json({ error: "users must be an array" });
  let imported = 0, skipped = 0;
  for (const u of users) {
    try { await User.create(u); imported++; } catch { skipped++; }
  }
  if (imported > 0) log("bulk_imported", req.admin.name || "Admin", `${imported} users`, skipped ? `${skipped} skipped` : "");
  res.status(201).json({ imported, skipped });
});

// ── Update ────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    log("updated", req.admin.name || "Admin", `${user.first_name} ${user.last_name}`);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Photo upload ──────────────────────────────────────────
router.post("/:id/photo", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const b64 = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "aerobase/avatars",
      transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
    });
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { photo: result.secure_url },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Activity ping ─────────────────────────────────────────
router.patch("/:id/activity", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { lastActivity: new Date() }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete ────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    await Note.deleteMany({ userId: req.params.id });
    log("deleted", req.admin.name || "Admin", `${user.first_name} ${user.last_name}`);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Notes ─────────────────────────────────────────────────
router.get("/:id/notes", async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.params.id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/notes", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Note text is required" });
    const note = await Note.create({
      userId:    req.params.id,
      text:      text.trim(),
      adminName: req.admin.name || "Admin",
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id/notes/:noteId", async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.noteId, userId: req.params.id });
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json({ message: "Note deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Tags ─────────────────────────────────────────────────
router.patch("/:id/tags", async (req, res) => {
  try {
    const tags = Array.isArray(req.body.tags) ? req.body.tags.map(t => String(t).trim()).filter(Boolean) : [];
    const user = await User.findByIdAndUpdate(req.params.id, { tags }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reminders ─────────────────────────────────────────────
router.get("/:id/reminders", async (req, res) => {
  try {
    const reminders = await Reminder.find({ userId: req.params.id }).sort({ dueAt: 1 });
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/reminders", async (req, res) => {
  try {
    const { note, dueAt } = req.body;
    if (!note?.trim() || !dueAt) return res.status(400).json({ error: "note and dueAt are required" });
    const reminder = await Reminder.create({
      userId:    req.params.id,
      adminName: req.admin.name || "Admin",
      note:      note.trim(),
      dueAt:     new Date(dueAt),
    });
    res.status(201).json(reminder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Email ─────────────────────────────────────────────────
router.post("/:id/email", async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject?.trim() || !message?.trim())
      return res.status(400).json({ error: "Subject and message are required" });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({
      to:      user.email,
      from:    process.env.SENDGRID_FROM_EMAIL,
      subject: subject.trim(),
      html: `<p>${message.trim().replace(/\n/g, "<br>")}</p>
             <br><p style="color:#888;font-size:12px">Sent via AeroBase by ${req.admin.name || "Admin"}</p>`,
    });
    log("emailed", req.admin.name || "Admin", `${user.first_name} ${user.last_name}`, subject.trim());
    res.json({ message: "Email sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
