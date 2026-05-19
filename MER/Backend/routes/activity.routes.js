import express from "express";
import ActivityLog from "../models/activity.model.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
