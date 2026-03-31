import { useState, useRef } from "react";

export default function App() {
  const [images, setImages] = useState([]);
  const [detected, setDetected] = useState(null);   // { ingredients, top_predictions }
  const [recipes, setRecipes] = useState(null);
  const [detectLoading, setDetectLoading] = useState(false);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  function handleFiles(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setImages((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]);
    setDetected(null);
    setRecipes(null);
    setError(null);
    e.target.value = "";
  }

  function removeImage(i) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
    setDetected(null);
    setRecipes(null);
  }

  async function handleDetect() {
    if (!images.length) return;
    setDetectLoading(true);
    setRecipes(null);
    setError(null);
    try {
      const form = new FormData();
      images.forEach(({ file }) => form.append("images", file));
      const res = await fetch("/detect", { method: "POST", body: form });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setDetected(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setDetectLoading(false);
    }
  }

  async function handleGetRecipes() {
    if (!detected?.ingredients?.length) return;
    setRecipeLoading(true);
    setError(null);
    try {
      const res = await fetch("/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: detected.ingredients }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setRecipes(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setRecipeLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-amber-800 mb-1">🍳 AI Kitchen Assistant</h1>
        <p className="text-amber-600 mb-6 text-sm">Upload food images → detect ingredients → get AI recipes</p>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          {images.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {images.map(({ preview }, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-amber-100">
                  <img src={preview} alt={`upload-${i}`} className="w-full h-28 object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >✕</button>
                </div>
              ))}
              <div
                onClick={() => fileRef.current.click()}
                className="h-28 border-2 border-dashed border-amber-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50 transition text-amber-400"
              >
                <span className="text-2xl">+</span>
                <span className="text-xs mt-1">Add more</span>
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-amber-300 rounded-xl p-10 text-center cursor-pointer hover:bg-amber-50 transition mb-4"
              onClick={() => fileRef.current.click()}
            >
              <div className="text-5xl mb-2">📷</div>
              <p className="text-sm text-amber-400">Click to upload food images</p>
              <p className="text-xs text-amber-300 mt-1">You can select multiple at once</p>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

          <button
            onClick={handleDetect}
            disabled={!images.length || detectLoading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white font-semibold py-2.5 rounded-xl transition"
          >
            {detectLoading ? "Detecting…" : `🔍 Detect Ingredients`}
          </button>

          {error && <p className="mt-3 text-red-500 text-sm text-center">{error}</p>}
        </div>

        {/* Detected Ingredients */}
        {detected && (
          <div className="bg-white rounded-2xl shadow p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-amber-800">
                🥦 Detected Ingredients
              </h2>
              <span className="text-xs text-amber-400 bg-amber-50 px-2 py-0.5 rounded-full">
                {detected.imageCount} image{detected.imageCount > 1 ? "s" : ""} · top 2 per image
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {detected.ingredients.map((ing) => (
                <span key={ing} className="bg-amber-100 text-amber-800 text-sm px-3 py-1 rounded-full capitalize">{ing}</span>
              ))}
            </div>
            <div className="space-y-1 mb-5">
              {detected.top_predictions.map(({ label, score }, i) => (
                <div key={`${label}-${i}`} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-28 truncate capitalize">{label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${Math.min((score * 100).toFixed(0), 100)}%` }} />
                  </div>
                  <span>{(score * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>

            {/* Get Recipes Button */}
            <button
              onClick={handleGetRecipes}
              disabled={recipeLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-200 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
            >
              {recipeLoading ? (
                <><span className="animate-spin">⏳</span> Asking Groq AI…</>
              ) : (
                "🤖 Get Recipes from AI"
              )}
            </button>
          </div>
        )}

        {/* LLM Recipes Section */}
        {recipes?.recipes?.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-bold text-amber-800">🤖 AI Recipe Suggestions</h2>
              <span className="bg-amber-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {recipes.recipes.length} recipe{recipes.recipes.length > 1 ? "s" : ""}
              </span>
              <span className="text-xs text-gray-400 ml-auto">via Groq · llama-3.3-70b</span>
            </div>

            {recipes.recipes.map((recipe, i) => (
              <div key={i} className="bg-white rounded-2xl shadow mb-4 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-5 py-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-white text-lg leading-tight">{recipe.name}</h3>
                    <span className="shrink-0 ml-3 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                      {recipe.steps?.length} steps
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-green-600 mb-1.5">✅ You have</p>
                      <div className="flex flex-wrap gap-1.5">
                        {detected.ingredients
                          .filter((ing) => !recipe.missing_ingredients?.includes(ing))
                          .map((ing) => (
                            <span key={ing} className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full capitalize">{ing}</span>
                          ))}
                      </div>
                    </div>
                    {recipe.missing_ingredients?.length > 0 && (
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-red-500 mb-1.5">🛒 You need</p>
                        <div className="flex flex-wrap gap-1.5">
                          {recipe.missing_ingredients.map((m) => (
                            <span key={m} className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-full capitalize">{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 mb-4" />

                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Instructions</p>
                  <ol className="space-y-3">
                    {recipe.steps.map((step, j) => (
                      <li key={j} className="flex gap-3">
                        <span className="shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                          {j + 1}
                        </span>
                        <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
