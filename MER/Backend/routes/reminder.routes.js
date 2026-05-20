import express from "express";
import Reminder from "../models/reminder.model.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protect);

// GET /api/reminders?done=false — global list with user info
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.done !== undefined) filter.done = req.query.done === "true";
    const reminders = await Reminder.find(filter)
      .sort({ dueAt: 1 })
      .populate("userId", "first_name last_name email photo");
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/reminders/:id/done — toggle done
router.patch("/:id/done", async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ error: "Reminder not found" });
    reminder.done = !reminder.done;
    await reminder.save();
    res.json(reminder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reminders/:id
router.delete("/:id", async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndDelete(req.params.id);
    if (!reminder) return res.status(404).json({ error: "Reminder not found" });
    res.json({ message: "Reminder deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
