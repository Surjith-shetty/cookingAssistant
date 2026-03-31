import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

async function detectFromImage(file) {
  const form = new FormData();
  form.append("file", file.buffer, { filename: file.originalname, contentType: file.mimetype });
  const { data } = await axios.post(`${AI_SERVICE_URL}/detect`, form, { headers: form.getHeaders() });
  return data;
}

// Step 1 — CLIP detection only
// Per image: take top 2 highest-confidence predictions → total = imageCount × 2 (deduplicated)
app.post("/detect", upload.array("images"), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: "No images provided" });

    const results = await Promise.all(req.files.map(detectFromImage));

    const seen = new Set();
    const allIngredients = [];
    const allPredictions = [];

    for (const r of results) {
      // Sort by score desc, take top 2 per image
      const top2 = [...r.top_predictions].sort((a, b) => b.score - a.score).slice(0, 2);
      for (const { label, score } of top2) {
        allPredictions.push({ label, score });
        if (!seen.has(label)) { seen.add(label); allIngredients.push(label); }
      }
    }

    res.json({ ingredients: allIngredients, top_predictions: allPredictions, imageCount: req.files.length });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

// Step 2 — Groq LLM recipes only
app.post("/recipes", async (req, res) => {
  try {
    const { ingredients } = req.body;
    if (!ingredients?.length) return res.status(400).json({ error: "No ingredients provided" });

    const systemPrompt = `You are an expert chef and cooking assistant.
The user will send you a list of ingredients they have at home.
Your job is to suggest 2–3 realistic, delicious recipes they can cook using those ingredients.

Rules:
- Use the provided ingredients as the primary base for each recipe.
- If a recipe needs 1–3 common pantry items not in the list (e.g. salt, oil, water), list them under missing_ingredients.
- Do NOT suggest recipes that require many missing ingredients.
- Each recipe must have clear, numbered step-by-step cooking instructions.
- Steps must be practical, specific, and easy to follow for a home cook.
- Always respond ONLY with a valid JSON object in this exact format:

{
  "recipes": [
    {
      "name": "Recipe Name",
      "missing_ingredients": ["item1", "item2"],
      "steps": [
        "Step 1: ...",
        "Step 2: ..."
      ]
    }
  ]
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here are my ingredients: ${ingredients.join(", ")}. What can I cook?` },
      ],
    });

    res.json(JSON.parse(completion.choices[0].message.content));
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
