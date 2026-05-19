import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import Deal from "../models/deal.model.js";

const router = express.Router();
router.use(protect);

const VALID_STAGES = ["New", "Qualified", "Proposal", "Won", "Lost"];

// GET / — list all deals, optional ?stage= filter
router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.query.stage && VALID_STAGES.includes(req.query.stage)) {
      query.stage = req.query.stage;
    }
    const deals = await Deal.find(query).sort({ createdAt: -1 });
    res.json(deals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST / — create deal
router.post("/", async (req, res) => {
  try {
    const deal = await Deal.create(req.body);
    res.status(201).json(deal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /:id — update deal
router.put("/:id", async (req, res) => {
  try {
    const deal = await Deal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json(deal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /:id/stage — update stage only
router.patch("/:id/stage", async (req, res) => {
  try {
    const { stage } = req.body;
    const update = { stage };
    if (stage === "Won" || stage === "Lost") {
      update.closedAt = new Date();
    } else {
      update.closedAt = null;
    }
    const deal = await Deal.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json(deal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /:id — delete deal
router.delete("/:id", async (req, res) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json({ message: "Deal deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
