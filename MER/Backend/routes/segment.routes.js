import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import Segment from "../models/segment.model.js";
import User from "../models/user.model.js";

const router = express.Router();
router.use(protect);

// GET / — list all segments sorted by createdAt desc
router.get("/", async (req, res) => {
  try {
    const segments = await Segment.find().sort({ createdAt: -1 });
    res.json(segments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST / — create segment
router.post("/", async (req, res) => {
  try {
    const segment = await Segment.create(req.body);
    res.status(201).json(segment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /:id — update segment
router.put("/:id", async (req, res) => {
  try {
    const segment = await Segment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!segment) return res.status(404).json({ message: "Segment not found" });
    res.json(segment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /:id — delete segment
router.delete("/:id", async (req, res) => {
  try {
    const segment = await Segment.findByIdAndDelete(req.params.id);
    if (!segment) return res.status(404).json({ message: "Segment not found" });
    res.json({ message: "Segment deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /:id/users — get users matching segment filters
router.get("/:id/users", async (req, res) => {
  try {
    const segment = await Segment.findById(req.params.id);
    if (!segment) return res.status(404).json({ message: "Segment not found" });

    const filter = {};
    for (const f of segment.filters) {
      const { field, operator, value } = f;
      switch (operator) {
        case "equals":
          filter[field] = value;
          break;
        case "not_equals":
          filter[field] = { $ne: value };
          break;
        case "contains":
          filter[field] = { $regex: value, $options: "i" };
          break;
        case "includes_tag":
          if (filter.tags && filter.tags.$all) {
            filter.tags.$all.push(value);
          } else {
            filter.tags = { $all: [value] };
          }
          break;
        default:
          break;
      }
    }

    const users = await User.find(filter).limit(100);
    res.json({ users, count: users.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
