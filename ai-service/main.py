from fastapi import FastAPI, File, UploadFile
from transformers import CLIPModel, CLIPProcessor
from PIL import Image
import torch
import io

app = FastAPI()

model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

FOOD_ITEMS = [
    "onion", "tomato", "garlic", "ginger", "potato", "carrot", "spinach",
    "broccoli", "cauliflower", "bell pepper", "chili", "lemon", "lime",
    "apple", "banana", "mango", "orange", "grapes", "strawberry",
    "turmeric", "cumin", "coriander", "pepper", "cinnamon", "cardamom",
    "rice", "wheat flour", "bread", "pasta", "oats",
    "chicken", "egg", "fish", "shrimp", "beef",
    "milk", "butter", "cheese", "yogurt", "cream",
    "olive oil", "salt", "sugar", "vinegar", "soy sauce"
]

PROMPT_TEMPLATES = [
    "a photo of {}",
    "fresh {}",
    "raw {}",
    "a close-up of {}",
    "cooking ingredient: {}"
]


def build_labels():
    labels = []
    item_index = []
    for item in FOOD_ITEMS:
        for tmpl in PROMPT_TEMPLATES:
            labels.append(tmpl.format(item))
            item_index.append(item)
    return labels, item_index


ALL_LABELS, ITEM_INDEX = build_labels()


@app.post("/detect")
async def detect_ingredients(file: UploadFile = File(...)):
    image = Image.open(io.BytesIO(await file.read())).convert("RGB")
    inputs = processor(text=ALL_LABELS, images=image, return_tensors="pt", padding=True)

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits_per_image[0]
        probs = logits.softmax(dim=0).tolist()

    # Aggregate scores per food item (max across prompt templates)
    item_scores: dict[str, float] = {}
    for idx, score in enumerate(probs):
        item = ITEM_INDEX[idx]
        item_scores[item] = max(item_scores.get(item, 0.0), score)

    top = sorted(item_scores.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "ingredients": [item for item, _ in top],
        "top_predictions": [{"label": item, "score": round(score, 4)} for item, score in top]
    }
