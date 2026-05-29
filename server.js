// server.js — paste this into a new Node.js project
// Setup: npm install express twilio cors dotenv

import express from "express";
import twilio from "twilio";
import cors from "cors";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

// ─── Config ────────────────────────────────────────────────────────────────
// Store these in a .env file — never hardcode them!
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,   // From twilio.com/console
  process.env.TWILIO_AUTH_TOKEN     // From twilio.com/console
);

// Add as many phone numbers as you want — all will get the SMS
const OWNER_PHONES = [
  process.env.OWNER_PHONE_1,        // e.g. "+15551234567"
  // process.env.OWNER_PHONE_2,     // Add more staff here
];

// ─── Escalation endpoint ────────────────────────────────────────────────────
app.post("/api/escalate", async (req, res) => {
  const { question, businessName = "Your Business", customerName = "A customer" } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  const message =
    `🚨 Unanswered question for ${businessName}\n\n` +
    `Customer asked: "${question}"\n\n` +
    `Log in to your dashboard to answer & train the AI so it won't ask you again.`;

  try {
    // Send to ALL owner phones simultaneously
    const results = await Promise.all(
      OWNER_PHONES.filter(Boolean).map((to) =>
        client.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio number
          to,
        })
      )
    );

    console.log(`SMS sent to ${results.length} recipient(s) for: "${question}"`);
    res.json({ success: true, recipients: results.length });

  } catch (err) {
    console.error("Twilio error:", err.message);
    res.status(500).json({ error: "Failed to send SMS", detail: err.message });
  }
});

// ─── Health check ──────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(3000, () => console.log("Server running on port 3000"));
