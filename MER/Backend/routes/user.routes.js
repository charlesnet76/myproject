import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";
import { protect } from "../middleware/auth.middleware.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = express.Router();
router.use(protect);

const SORT_FIELDS = new Set(["first_name", "last_name", "email", "createdAt", "lastActivity"]);

router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 12, sort = "createdAt", order = "desc", search = "", gender = "" } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { first_name: { $regex: search, $options: "i" } },
        { last_name:  { $regex: search, $options: "i" } },
        { email:      { $regex: search, $options: "i" } },
      ];
    }
    if (gender && gender !== "All") filter.gender = gender;

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

router.get("/export", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const cols = ["first_name", "last_name", "email", "gender", "ip_address", "lastActivity", "createdAt"];
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

router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/bulk", async (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users)) return res.status(400).json({ error: "users must be an array" });
  let imported = 0, skipped = 0;
  for (const u of users) {
    try { await User.create(u); imported++; } catch { skipped++; }
  }
  res.status(201).json({ imported, skipped });
});

router.put("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

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

router.patch("/:id/activity", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { lastActivity: new Date() }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
