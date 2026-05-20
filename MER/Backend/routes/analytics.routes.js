import express from "express";
import User from "../models/user.model.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [regsByDay, statusBreakdown, genderBreakdown, recentlyActive, total, active, inactive, banned, pipelineBreakdown, dealAgg] =
      await Promise.all([
        User.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        User.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        User.aggregate([{ $group: { _id: "$gender", count: { $sum: 1 } } }]),
        User.find({ lastActivity: { $ne: null } })
          .sort({ lastActivity: -1 })
          .limit(5)
          .select("first_name last_name email photo lastActivity"),
        User.countDocuments({}),
        User.countDocuments({ status: "Active" }),
        User.countDocuments({ status: "Inactive" }),
        User.countDocuments({ status: "Banned" }),
        User.aggregate([{ $group: { _id: "$pipelineStage", count: { $sum: 1 } } }]),
        User.aggregate([
          { $match: { "deal.value": { $gt: 0 } } },
          { $group: { _id: null, totalValue: { $sum: "$deal.value" }, count: { $sum: 1 } } },
        ]),
      ]);

    const deal = dealAgg[0] || { totalValue: 0, count: 0 };

    res.json({
      registrationsByDay: regsByDay,
      statusBreakdown,
      genderBreakdown,
      recentlyActive,
      totals: { total, active, inactive, banned },
      pipelineBreakdown,
      deal: { totalValue: deal.totalValue, count: deal.count },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
