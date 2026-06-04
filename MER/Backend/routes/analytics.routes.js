import express from "express";
import User from "../models/user.model.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      regsByDay, statusBreakdown, genderBreakdown, recentlyActive,
      total, active, inactive, banned,
      pipelineBreakdown, dealAgg,
      emailDomains, topFirstNames, ipClasses,
    ] = await Promise.all([
        User.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        User.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
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
        User.aggregate([
          { $match: { email: { $exists: true, $ne: null } } },
          { $project: { domain: { $arrayElemAt: [{ $split: ["$email", "@"] }, 1] } } },
          { $group: { _id: "$domain", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        User.aggregate([
          { $group: { _id: "$first_name", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        User.aggregate([
          { $match: { ip_address: { $exists: true, $ne: null } } },
          { $project: {
              firstOctet: { $toInt: { $arrayElemAt: [{ $split: ["$ip_address", "."] }, 0] } },
          }},
          { $project: {
              ipClass: { $switch: {
                branches: [
                  { case: { $and: [{ $gte: ["$firstOctet", 1] },   { $lte: ["$firstOctet", 126] }] }, then: "Class A (1–126)" },
                  { case: { $and: [{ $gte: ["$firstOctet", 128] }, { $lte: ["$firstOctet", 191] }] }, then: "Class B (128–191)" },
                  { case: { $and: [{ $gte: ["$firstOctet", 192] }, { $lte: ["$firstOctet", 223] }] }, then: "Class C (192–223)" },
                ],
                default: "Other",
              }},
          }},
          { $group: { _id: "$ipClass", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
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
      emailDomains,
      topFirstNames,
      ipClasses,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
