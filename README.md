# 🍳 Smart AI Kitchen Assistant

Three-service architecture: React frontend → Node.js backend → Python CLIP service + OpenAI LLM.

```
recipe/
├── ai-service/   # Python FastAPI + CLIP
├── backend/      # Node.js Express
└── frontend/     # React + Vite + Tailwind
```

---

## Setup

### 1. Python AI Service

```bash
cd ai-service
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 8000
```

First run downloads the CLIP model (~600 MB). Subsequent starts are instant.

---

### 2. Node Backend

```bash
cd backend
# Edit .env — add your OpenAI API key
cp .env .env.local   # optional
npm install
npm run dev
```

`.env`:
```
OPENAI_API_KEY=sk-...
AI_SERVICE_URL=http://localhost:8000
PORT=3001
```

---

### 3. React Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. Requests to `/analyze` are proxied to `http://localhost:3001`.

---

## API Reference

### Python Service — `POST http://localhost:8000/detect`

```bash
curl -X POST http://localhost:8000/detect \
  -F "file=@/path/to/image.jpg"
```

Response:
```json
{
  "ingredients": ["onion", "tomato", "garlic", "turmeric", "chili"],
  "top_predictions": [
    { "label": "onion", "score": 0.0412 },
    { "label": "tomato", "score": 0.0387 }
  ]
}
```

---

### Node Backend — `POST http://localhost:3001/analyze`

```bash
curl -X POST http://localhost:3001/analyze \
  -F "image=@/path/to/image.jpg"
```

Response:
```json
{
  "ingredients": ["onion", "tomato", "garlic"],
  "top_predictions": [...],
  "recipes": [
    {
      "name": "Tomato Onion Stir Fry",
      "missing_ingredients": ["oil"],
      "steps": [
        "Heat oil in a pan.",
        "Add chopped onions and sauté until golden.",
        "Add tomatoes and cook until soft.",
        "Season with salt and serve."
      ]
    }
  ]
}
```

---

## Notes

- CLIP scores are low by design (softmax over ~200 labels) — relative ranking matters, not absolute values.
- The LLM used is `llama-3.3-70b-versatile` via the Groq API. Change the model in `backend/index.js` if needed.
- No database, no streaming, fully local except for API call.
