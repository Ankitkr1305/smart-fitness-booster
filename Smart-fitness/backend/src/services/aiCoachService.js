const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function parseJsonFromText(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch (innerError) {
      return null;
    }
  }
}

function normalizeList(value, fallback = [], maxItems = 5) {
  if (!Array.isArray(value)) {
    return fallback.slice(0, maxItems);
  }

  const cleaned = value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, maxItems);

  return cleaned.length ? cleaned : fallback.slice(0, maxItems);
}

function normalizeSchedule(value, fallback = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const cleaned = value
    .map((item) => ({
      time: String(item?.time || "").trim(),
      title: String(item?.title || "").trim(),
      detail: String(item?.detail || "").trim()
    }))
    .filter((item) => item.time && item.title)
    .slice(0, 8);

  return cleaned.length ? cleaned : fallback;
}

function normalizeMeals(value, fallback = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const cleaned = value
    .map((item) => ({
      title: String(item?.title || "").trim(),
      time: String(item?.time || "").trim(),
      detail: String(item?.detail || "").trim()
    }))
    .filter((item) => item.title && item.time)
    .slice(0, 6);

  return cleaned.length ? cleaned : fallback;
}

function mapOutputText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data?.output)) {
    return "";
  }

  return data.output
    .flatMap((block) => block?.content || [])
    .filter((item) => item?.type === "output_text")
    .map((item) => item?.text || "")
    .join("\n")
    .trim();
}

function mergeWithFallback(parsed, fallbackPlan) {
  if (!parsed || typeof parsed !== "object") {
    return fallbackPlan;
  }

  return {
    headline: String(parsed.headline || fallbackPlan.headline || "").trim() || fallbackPlan.headline,
    summary: String(parsed.summary || fallbackPlan.summary || "").trim() || fallbackPlan.summary,
    actionItems: normalizeList(parsed.actionItems, fallbackPlan.actionItems, 6),
    avoidItems: normalizeList(parsed.avoidItems, fallbackPlan.avoidItems, 6),
    recoveryItems: normalizeList(parsed.recoveryItems, fallbackPlan.recoveryItems, 5),
    schedule: normalizeSchedule(parsed.schedule, fallbackPlan.schedule),
    meals: normalizeMeals(parsed.meals, fallbackPlan.meals),
    focusArea: String(parsed.focusArea || fallbackPlan.focusArea || "").trim() || fallbackPlan.focusArea,
    stepGoal: Number(parsed.stepGoal || fallbackPlan.stepGoal || 0) || fallbackPlan.stepGoal,
    caloriesTarget: Number(parsed.caloriesTarget || fallbackPlan.caloriesTarget || 0) || fallbackPlan.caloriesTarget
  };
}

async function generateLiveAiCoachPlan({
  user,
  preferences,
  profileInsights,
  summary,
  nutrition,
  schedule,
  workout,
  fallbackPlan
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || typeof fetch !== "function") {
    return {
      plan: fallbackPlan,
      source: "Rule AI",
      live: false
    };
  }

  const contextPayload = {
    generatedAt: new Date().toISOString(),
    user,
    preferences,
    profileInsights,
    summary,
    nutrition,
    schedule,
    workout
  };

  const systemPrompt = [
    "You are an expert fitness planning coach.",
    "Use only the provided dashboard data.",
    "Give practical, safe, and personalized fitness advice.",
    "Do not claim medical diagnosis. Keep recommendations actionable.",
    "Return ONLY valid JSON."
  ].join(" ");

  const userPrompt = `
Create personalized coaching JSON for this user.

Return this exact JSON shape:
{
  "headline": "string",
  "summary": "string",
  "actionItems": ["string"],
  "avoidItems": ["string"],
  "recoveryItems": ["string"],
  "schedule": [{"time":"HH:mm","title":"string","detail":"string"}],
  "meals": [{"title":"string","time":"HH:mm","detail":"string"}],
  "focusArea": "string",
  "stepGoal": 0,
  "caloriesTarget": 0
}

Rules:
- actionItems: 3-5 items
- avoidItems: 3-5 items
- recoveryItems: 2-4 items
- schedule: max 8 items
- meals: 3-4 items
- use realistic values from user context

User context JSON:
${JSON.stringify(contextPayload)}
`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userPrompt }]
          }
        ],
        temperature: 0.4,
        max_output_tokens: 900
      })
    });

    if (!response.ok) {
      throw new Error(`AI API failed (${response.status})`);
    }

    const data = await response.json();
    const outputText = mapOutputText(data);
    const parsed = parseJsonFromText(outputText);
    const plan = mergeWithFallback(parsed, fallbackPlan);

    return {
      plan,
      source: "Live AI",
      live: true,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      plan: fallbackPlan,
      source: "Rule AI",
      live: false,
      error: error.message
    };
  }
}

module.exports = {
  generateLiveAiCoachPlan
};
