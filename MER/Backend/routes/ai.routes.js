import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import User from "../models/user.model.js";
import Anthropic from "@anthropic-ai/sdk";

const router = express.Router();
router.use(protect);

// POST /score/:userId — AI lead scoring
router.post("/score/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const tags = user.tags && user.tags.length > 0 ? user.tags.join(", ") : "None";
    const lastActivity = user.lastActivity ? user.lastActivity.toISOString() : "Never";

    const prompt =
      `You are a CRM lead scoring assistant. Score this contact as a sales lead from 1-10 (10 = highest potential). Respond ONLY with valid JSON: {"score": <number 1-10>, "reason": "<one sentence why>", "recommendation": "<one actionable next step>"}\n\n` +
      `Contact:\n` +
      `Name: ${user.first_name} ${user.last_name}\n` +
      `Email: ${user.email}\n` +
      `Status: ${user.status}\n` +
      `Tags: ${tags}\n` +
      `Last Activity: ${lastActivity}\n` +
      `Created: ${user.createdAt.toISOString()}`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].text.trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        score: 5,
        reason: "Unable to parse AI response.",
        recommendation: "Manual review recommended.",
      };
    }

    res.json({
      userId: user._id,
      score: parsed.score,
      reason: parsed.reason,
      recommendation: parsed.recommendation,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
