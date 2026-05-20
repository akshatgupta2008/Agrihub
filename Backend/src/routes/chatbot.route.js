import express from "express";
import { ENV } from "../lib/ENV.js";
import { Ollama } from "ollama";

const router = express.Router();

const MEDICAL_SYSTEM_PROMPT = `You are MedGemma, a warm and knowledgeable medical AI assistant for patients. Your goal is to be genuinely helpful for ANY health-related question or concern.

You can assist with:
• Symptoms and health conditions
• Medications, dosage, and side effects
• Medical procedures and treatments
• Lab results and medical reports
• Diet, nutrition, and lifestyle
• Mental health and emotional well-being
• First aid and emergency situations
• Preventive care and vaccinations
• Fitness and exercise guidance
• Sleep and stress management
• General health education

PERSONA:
- Be warm, empathetic, and patient
- Think like a knowledgeable friend who happens to be medically informed
- Actively try to help solve the patient's concern
- Ask follow-up questions if you need more information
- Offer practical tips and next steps when appropriate

IMPORTANT RULES:
1. Start every response with: "⚠️ I'm an AI assistant — not a substitute for professional medical advice. Please consult your doctor for any health concerns."
2. Use simple, plain language (avoid jargon or explain it)
3. Be concise but thorough — adapt length to the question
4. Format nicely with **bold** for key terms, • for bullet points
5. For serious symptoms (chest pain, difficulty breathing, severe bleeding, etc.), urgently advise calling emergency services
6. Never prescribe controlled substances — redirect to a physician
7. If you're unsure about something, say so honestly
8. End responses helpfully — offer to elaborate, ask follow-up questions, or suggest what to do next`;

const stripDataUrlPrefix = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  // Accept both raw base64 and data URLs like "data:image/png;base64,...."
  const match = trimmed.match(/^data:.*?;base64,(.*)$/);
  return (match?.[1] || trimmed) || null;
};

// Always use the official client. If host is omitted, it defaults to http://localhost:11434.
const ollama = new Ollama(ENV.OLLAMA_URL ? { host: ENV.OLLAMA_URL } : undefined);

router.post("/chat", async (req, res) => {
  try {
    const { message, imageBase64 } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message field is required and must be a string" });
    }

    const image = imageBase64 ? stripDataUrlPrefix(imageBase64) : null;

    const messages = [
      { role: "system", content: MEDICAL_SYSTEM_PROMPT },
      {
        role: "user",
        content: message,
        ...(image ? { images: [image] } : {}),
      },
    ];

    const stream = await ollama.chat({
      model: "medgemma",
      messages,
      stream: true,
    });

    // Only set streaming headers once we know we can stream.
    res.status(200);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.flushHeaders?.();

    for await (const part of stream) {
      const token = part?.message?.content;
      if (token) {
        res.write(token);
      }
    }

    res.end();
  } catch (e) {
    // If we already started streaming, we can't switch to JSON safely.
    if (res.headersSent) {
      try {
        res.write("\n\n[Error: Failed to reach Ollama service]\n");
      } catch {
        // ignore
      }
      return res.end();
    }

    return res.status(502).json({
      error: "Failed to reach Ollama service",
      details: String(e?.message || e),
      ollamaUrl: ENV.OLLAMA_URL,
    });
  }
});

export default router;