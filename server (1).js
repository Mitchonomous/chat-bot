// server.js
import express from "express";
import twilio from "twilio";
import cors from "cors";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

// ─── Health check (Railway uses this to confirm app is running) ────────────
app.get("/", (_, res) => res.json({ status: "ok", message: "Chatbot server is running." }));
app.get("/health", (_, res) => res.json({ status: "ok" }));

// ─── Escalation endpoint ───────────────────────────────────────────────────
app.post("/api/escalate", async (req, res) => {
  const { question, businessName = "Your Business" } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  // Check that Twilio credentials are present
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error("Missing Twilio environment variables.");
    return res.status(500).json({ error: "Twilio not configured on server." });
  }

  // Build list of recipient phones from env variables
  const OWNER_PHONES = [
    process.env.OWNER_PHONE_1,
    process.env.OWNER_PHONE_2,
    process.env.OWNER_PHONE_3,
  ].filter(Boolean);

  if (OWNER_PHONES.length === 0) {
    return res.status(500).json({ error: "No owner phone numbers configured." });
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  const message =
    `🚨 Unanswered question for ${businessName}\n\n` +
    `Customer asked: "${question}"\n\n` +
    `Log in to your dashboard to answer & train the AI.`;

  try {
    const results = await Promise.all(
      OWNER_PHONES.map((to) =>
        client.messages.create({
          body: message,
          from: TWILIO_PHONE_NUMBER,
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

// ─── Use Railway's dynamic PORT — this is the critical fix ────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
