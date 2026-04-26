const express = require("express");
const protect = require("../middleware/authMiddleware");
const Activity = require("../models/Activity");
const DashboardData = require("../models/DashboardData");
const User = require("../models/User");
const { generateLiveAiCoachPlan } = require("../services/aiCoachService");

const router = express.Router();

function defaultActivity() {
  return [
    { action: "Completed", detail: "12,480 steps today." },
    { action: "Logged", detail: "breakfast with 32g protein." },
    { action: "Improved", detail: "weekly sleep score by 9%." }
  ];
}

async function saveDashboardData(userId, eventType, label, payload = {}) {
  return DashboardData.create({
    user: userId,
    eventType,
    label,
    payload,
    source: "dashboard"
  });
}

function buildAchievements(user, preferences) {
  const badges = [];
  const streak = user.streak || 1;
  const totalLoginDays = user.totalLoginDays || streak;

  if (streak >= 1) {
    badges.push("Starter login");
  }
  if (streak >= 3) {
    badges.push("3 day streak");
  }
  if (streak >= 7) {
    badges.push("7 day streak");
  }
  if (streak >= 15) {
    badges.push("15 day streak");
  }
  if (streak >= 30) {
    badges.push("30 day streak");
  }
  if (totalLoginDays >= 10) {
    badges.push("Regular tracker");
  }
  if ((preferences?.hydrationGoal || 0) >= 4) {
    badges.push("Hydration hero");
  }
  if ((preferences?.workoutDays || 0) >= 5) {
    badges.push("Weekly warrior");
  }

  return badges.slice(0, 6);
}

function toTitleCase(value) {
  return String(value || "")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function workoutLibrary(type, level, duration) {
  const plans = {
    strength: [
      { title: "Warm-up mobility", meta: "8 min" },
      { title: "Push-ups and rows", meta: level === "Advanced" ? "5 sets" : "4 sets" },
      { title: "Shoulder press", meta: level === "Advanced" ? "4 sets" : "3 sets" },
      { title: "Cool-down stretch", meta: "6 min" }
    ],
    cardio: [
      { title: "Dynamic warm-up", meta: "6 min" },
      { title: "Intervals and brisk walk", meta: `${Math.max(duration - 14, 15)} min` },
      { title: "Core finisher", meta: "8 min" },
      { title: "Breathing recovery", meta: "4 min" }
    ],
    yoga: [
      { title: "Breathing reset", meta: "5 min" },
      { title: "Mobility flow", meta: `${Math.max(duration - 15, 15)} min` },
      { title: "Balance poses", meta: "10 min" },
      { title: "Relaxation stretch", meta: "5 min" }
    ],
    hiit: [
      { title: "Quick warm-up", meta: "5 min" },
      { title: "HIIT rounds", meta: `${Math.max(duration - 15, 16)} min` },
      { title: "Bodyweight finisher", meta: "8 min" },
      { title: "Cool-down stretch", meta: "5 min" }
    ]
  };

  return plans[type.toLowerCase()] || plans.strength;
}

function nutritionPlan(goal, mealPreference, hydrationGoal, preferences = {}) {
  const normalizedGoal = String(goal || "").toLowerCase();
  const currentWeight = Number(preferences.currentWeight || 65);
  const activityLevel = preferences.activityLevel || "Moderate";
  const activityBoost =
    activityLevel === "Very Active" ? 220 :
    activityLevel === "Moderate" ? 120 :
    activityLevel === "Light" ? 40 :
    0;
  const caloriesBase =
    normalizedGoal.includes("lose") ? currentWeight * 25 :
    normalizedGoal.includes("muscle") ? currentWeight * 33 :
    normalizedGoal.includes("stamina") ? currentWeight * 31 :
    currentWeight * 28;
  const calories = Math.round(caloriesBase + activityBoost);

  const protein =
    normalizedGoal.includes("muscle") ? `${Math.round(currentWeight * 2)}g` :
    normalizedGoal.includes("lose") ? `${Math.round(currentWeight * 1.7)}g` :
    `${Math.round(currentWeight * 1.5)}g`;

  const carbs =
    mealPreference === "High Protein"
      ? `${Math.round(currentWeight * 2.5)}g`
      : normalizedGoal.includes("stamina")
        ? `${Math.round(currentWeight * 3.2)}g`
        : `${Math.round(currentWeight * 2.7)}g`;
  const fats = mealPreference === "Vegetarian" ? "60g" : `${Math.max(50, Math.round(currentWeight * 0.8))}g`;

  return {
    calories,
    note: `Next suggestion: choose a ${mealPreference.toLowerCase()} meal and finish ${hydrationGoal}L water today.`,
    macros: [
      { label: "Protein", value: protein },
      { label: "Carbs", value: carbs },
      { label: "Fats", value: fats }
    ]
  };
}

function buildSchedule(preferences, workoutTitle) {
  return [
    { time: preferences.wakeTime, title: "Wake up and light mobility" },
    { time: "13:30", title: `${preferences.hydrationGoal}L hydration reminder` },
    { time: preferences.workoutTime, title: workoutTitle },
    { time: preferences.sleepTime, title: "Sleep wind-down" }
  ];
}

function shiftTime(timeValue, minuteOffset) {
  const [hours = "07", minutes = "00"] = String(timeValue || "07:00").split(":");
  const totalMinutes = Number(hours) * 60 + Number(minutes) + minuteOffset;
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function progressFromPreferences(preferences) {
  const activityBoost =
    preferences.activityLevel === "Very Active" ? 8 :
    preferences.activityLevel === "Moderate" ? 4 :
    preferences.activityLevel === "Light" ? 1 :
    0;
  const sleepBoost = Math.max(0, (Number(preferences.sleepHours || 6) - 6) * 2);
  const base = Math.min(95, 52 + preferences.workoutDays * 5 + activityBoost + sleepBoost);
  return [
    { label: "Steps", value: Math.min(96, base + 3) },
    { label: "Workout", value: Math.min(94, base) },
    { label: "Nutrition", value: Math.min(92, base - 4) },
    { label: "Sleep", value: Math.min(97, base + 7) }
  ];
}

function calculateBmi(height, currentWeight) {
  if (!height || !currentWeight) {
    return null;
  }

  const meters = Number(height) / 100;
  if (!meters) {
    return null;
  }

  return Number((Number(currentWeight) / (meters * meters)).toFixed(1));
}

function buildProfileInsights(user, preferences) {
  const currentWeight = Number(preferences.currentWeight || 0);
  const targetWeight = Number(preferences.targetWeight || 0);
  const bmi = calculateBmi(preferences.height, currentWeight);
  const weightChange =
    currentWeight && targetWeight
      ? Number((targetWeight - currentWeight).toFixed(1))
      : null;

  let paceLabel = "Steady plan";
  if (weightChange !== null) {
    paceLabel =
      weightChange < 0 ? `${Math.abs(weightChange)} kg to lose` :
      weightChange > 0 ? `${weightChange} kg to gain` :
      "Weight maintenance";
  }

  const sleepHours = Number(preferences.sleepHours || 0);
  const recoveryLabel =
    sleepHours >= 8 ? "Recovery-friendly sleep target" :
    sleepHours >= 6 ? "Moderate recovery target" :
    "Sleep target needs support";

  return {
    currentWeight: currentWeight || null,
    targetWeight: targetWeight || null,
    height: Number(preferences.height || 0) || null,
    bmi,
    weightChange,
    paceLabel,
    recoveryLabel,
    activityLevel: preferences.activityLevel || "Not set",
    equipmentAccess: preferences.equipmentAccess || "Not set",
    primaryChallenge: preferences.primaryChallenge || "Not set",
    sleepHours: sleepHours || null
  };
}

function buildHabitSignals(preferences, profileInsights) {
  const hydrationText = `${preferences.hydrationGoal}L daily hydration target`;
  const sleepText = profileInsights.sleepHours
    ? `${profileInsights.sleepHours}h planned sleep`
    : "Set your sleep target for sharper recovery";
  const challengeText = preferences.primaryChallenge
    ? `Main blocker: ${preferences.primaryChallenge}`
    : "Add your main challenge for tighter advice";

  return [
    { label: "Hydration", value: hydrationText },
    { label: "Recovery", value: sleepText },
    { label: "Constraint", value: challengeText }
  ];
}

function buildAiPlan(user, preferences, workoutTitle, nutrition) {
  const schedulePreference = preferences.schedulePreference || "Evening";
  const dietaryPreference = preferences.dietaryPreference || preferences.mealPreference || "Balanced";
  const stepGoal = Number(preferences.stepGoal || 9000);
  const focusArea = preferences.focusArea || preferences.preferredWorkout || "General fitness";
  const wakeTime = preferences.wakeTime || "07:00";
  const workoutTime = preferences.workoutTime || "18:00";
  const sleepTime = preferences.sleepTime || "22:30";

  const meals = dietaryPreference === "Vegetarian"
    ? [
        { title: "Breakfast", time: shiftTime(wakeTime, 45), detail: "Oats or poha with curd / fruit." },
        { title: "Lunch", time: "13:30", detail: "Dal, roti, sabzi, paneer or soy-based protein." },
        { title: "Snack", time: shiftTime(workoutTime, -60), detail: "Curd, chana, banana, or lassi for workout fuel." },
        { title: "Dinner", time: shiftTime(workoutTime, 90), detail: "Light protein-focused meal with vegetables." }
      ]
    : [
        { title: "Breakfast", time: shiftTime(wakeTime, 45), detail: "Eggs or oats with fruit and hydration." },
        { title: "Lunch", time: "13:30", detail: "Protein-heavy lunch with balanced carbs." },
        { title: "Snack", time: shiftTime(workoutTime, -60), detail: "High-protein snack before training." },
        { title: "Dinner", time: shiftTime(workoutTime, 90), detail: "Recovery meal with protein and vegetables." }
      ];

  const schedule = [
    { time: wakeTime, title: "Wake and reset", detail: "Water, light mobility, and body check." },
    { time: meals[0].time, title: meals[0].title, detail: meals[0].detail },
    { time: "11:30", title: "Focus / posture reset", detail: "2-minute stretch and water break." },
    { time: meals[1].time, title: meals[1].title, detail: meals[1].detail },
    { time: meals[2].time, title: meals[2].title, detail: meals[2].detail },
    { time: workoutTime, title: workoutTitle, detail: `${preferences.availableMinutes} min ${focusArea.toLowerCase()} block` },
    { time: meals[3].time, title: meals[3].title, detail: meals[3].detail },
    { time: sleepTime, title: "Sleep wind-down", detail: "Screen down, calm down, recovery on." }
  ];

  const actionItems = [
    `Protect your ${preferences.availableMinutes}-minute ${schedulePreference.toLowerCase()} routine.`,
    `Hit ${stepGoal.toLocaleString("en-IN")} daily steps in small blocks if needed.`,
    `Use your ${preferences.equipmentAccess || "selected"} setup for the main workout focus.`,
    `Keep ${nutrition.calories.toLocaleString("en-IN")} kcal and ${preferences.hydrationGoal}L water as your daily anchors.`
  ];

  const avoidItems = [
    `Avoid letting "${preferences.primaryChallenge || "your main challenge"}" break the entire day.`,
    "Avoid skipping the pre-workout fuel window.",
    "Avoid random training changes when the schedule is already mapped.",
    "Avoid going late to bed when recovery is part of the target."
  ];

  const recoveryItems = [
    `Aim for ${preferences.sleepHours || 7} hours sleep with a proper wind-down.`,
    "Do a short stretch or walk after long sitting blocks.",
    "Spread hydration through the day instead of catching up late.",
    `Use stress control cues because your current stress level is ${preferences.stressLevel || "not set"}.`
  ];

  return {
    headline: `${user.fullName.split(" ")[0]}, your AI-managed day is built from your own inputs`,
    summary: `The dashboard is now following your ${user.goal.toLowerCase()} goal, ${preferences.activityLevel || "custom"} activity level, ${preferences.occupation || "daily routine"}, and your main challenge: ${preferences.primaryChallenge || "not set"}.`,
    meals,
    schedule,
    actionItems,
    avoidItems,
    recoveryItems,
    focusArea,
    stepGoal,
    caloriesTarget: nutrition.calories
  };
}

function getLatestPreferenceSnapshot(dashboardEvents = []) {
  const latestPreferenceEvent = dashboardEvents.find((item) => item.eventType === "preferences_update");

  return {
    goal: latestPreferenceEvent?.payload?.goal || "",
    preferences: latestPreferenceEvent?.payload?.preferences || {}
  };
}

async function buildDashboard(req, options = {}) {
  const firstName = req.user.fullName.split(" ")[0] || "Athlete";
  const userActivities = await Activity.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();
  const dashboardEvents = await DashboardData.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const latestPreferenceSnapshot = getLatestPreferenceSnapshot(dashboardEvents);
  const savedPreferences = latestPreferenceSnapshot.preferences || {};
  const preferences = {
    wakeTime: savedPreferences.wakeTime || req.user.preferences?.wakeTime || "07:00",
    workoutTime: savedPreferences.workoutTime || req.user.preferences?.workoutTime || "18:00",
    sleepTime: savedPreferences.sleepTime || req.user.preferences?.sleepTime || "22:30",
    preferredWorkout: savedPreferences.preferredWorkout || req.user.preferences?.preferredWorkout || "Strength",
    experienceLevel: savedPreferences.experienceLevel || req.user.preferences?.experienceLevel || "Beginner",
    availableMinutes: Number(savedPreferences.availableMinutes) || req.user.preferences?.availableMinutes || 38,
    workoutDays: Number(savedPreferences.workoutDays) || req.user.preferences?.workoutDays || 4,
    mealPreference: savedPreferences.mealPreference || req.user.preferences?.mealPreference || "Balanced",
    hydrationGoal: Number(savedPreferences.hydrationGoal) || req.user.preferences?.hydrationGoal || 3,
    currentWeight: Number(savedPreferences.currentWeight) || req.user.preferences?.currentWeight || null,
    targetWeight: Number(savedPreferences.targetWeight) || req.user.preferences?.targetWeight || null,
    height: Number(savedPreferences.height) || req.user.preferences?.height || null,
    sleepHours: Number(savedPreferences.sleepHours) || req.user.preferences?.sleepHours || null,
    activityLevel: savedPreferences.activityLevel || req.user.preferences?.activityLevel || "",
    equipmentAccess: savedPreferences.equipmentAccess || req.user.preferences?.equipmentAccess || "",
    primaryChallenge: savedPreferences.primaryChallenge || req.user.preferences?.primaryChallenge || "",
    age: Number(savedPreferences.age) || req.user.preferences?.age || null,
    occupation: savedPreferences.occupation || req.user.preferences?.occupation || "",
    dietaryPreference: savedPreferences.dietaryPreference || req.user.preferences?.dietaryPreference || "",
    schedulePreference: savedPreferences.schedulePreference || req.user.preferences?.schedulePreference || "",
    stressLevel: savedPreferences.stressLevel || req.user.preferences?.stressLevel || "",
    stepGoal: Number(savedPreferences.stepGoal) || req.user.preferences?.stepGoal || null,
    focusArea: savedPreferences.focusArea || req.user.preferences?.focusArea || ""
  };
  const effectiveGoal = latestPreferenceSnapshot.goal || req.user.goal;
  const workoutTitle = `${toTitleCase(preferences.preferredWorkout)} ${effectiveGoal.toLowerCase().includes("muscle") ? "power" : effectiveGoal.toLowerCase().includes("lose") ? "fat-burn" : "smart"} session`;
  const nutrition = nutritionPlan(effectiveGoal, preferences.mealPreference, preferences.hydrationGoal, preferences);
  const schedule = buildSchedule(preferences, workoutTitle);
  const progress = progressFromPreferences(preferences);
  const profileInsights = buildProfileInsights(req.user, preferences);
  const habitSignals = buildHabitSignals(preferences, profileInsights);
  const fallbackAiPlan = buildAiPlan({ ...req.user.toObject(), goal: effectiveGoal }, preferences, workoutTitle, nutrition);
  const workout = workoutLibrary(
    preferences.preferredWorkout,
    preferences.experienceLevel,
    preferences.availableMinutes
  );
  const score = Math.round((progress.reduce((sum, item) => sum + item.value, 0) / progress.length));
  const achievements = buildAchievements(req.user, preferences);
  const profileComplete = Boolean(
    preferences.currentWeight &&
    preferences.height &&
    preferences.activityLevel &&
    preferences.primaryChallenge &&
    preferences.workoutTime &&
    preferences.availableMinutes &&
    preferences.workoutDays &&
    preferences.hydrationGoal
  );

  const aiResult = await generateLiveAiCoachPlan({
    user: {
      name: req.user.fullName,
      goal: effectiveGoal,
      plan: req.user.plan
    },
    preferences,
    profileInsights,
    summary: {
      score,
      streak: req.user.streak
    },
    nutrition,
    schedule,
    workout: {
      title: workoutTitle,
      duration: preferences.availableMinutes,
      tasks: workout
    },
    fallbackPlan: fallbackAiPlan,
    forceRefresh: Boolean(options.forceAiRefresh)
  });

  const aiPlan = aiResult.plan || fallbackAiPlan;
  const aiSource = aiResult.source || "Rule AI";
  const aiLive = Boolean(aiResult.live);
  const aiGeneratedAt = aiResult.generatedAt || new Date().toISOString();

  return {
    user: {
      name: firstName,
      fullName: req.user.fullName,
      goal: effectiveGoal,
      plan: req.user.plan,
      streak: req.user.streak,
      totalLoginDays: req.user.totalLoginDays,
      preferences
    },
    aiPlan,
    aiSource,
    aiLive,
    aiGeneratedAt,
    profileInsights,
    habitSignals,
    profileComplete,
    summary: {
      goalCompleted: score,
      boosterScore: score,
      boosterTrend: `Built from ${preferences.workoutDays} workout days/week`,
      streak: req.user.streak,
      steps: 9000 + preferences.workoutDays * 820,
      stepsNote: `${Math.max(1000, 16000 - (9000 + preferences.workoutDays * 820)).toLocaleString()} left for target`,
      calories: Math.round((Number(preferences.currentWeight || 60) * 2.2) + preferences.availableMinutes * 5),
      caloriesNote: `${preferences.availableMinutes} min plan with ${preferences.activityLevel || "custom"} activity target`
    },
    progress,
    workoutTitle,
    workoutDuration: `${preferences.availableMinutes} min`,
    workout,
    nutrition,
    schedule,
    achievements,
    activity: userActivities.length
      ? userActivities.map((item) => ({ action: item.action, detail: item.detail }))
      : defaultActivity(),
    dashboardEvents: dashboardEvents.map((item) => ({
      eventType: item.eventType,
      label: item.label,
      payload: item.payload,
      createdAt: item.createdAt
    })),
    needsPreferences: !profileComplete
  };
}

router.get("/", protect, async (req, res) => {
  res.json(await buildDashboard(req));
});

router.post("/ai-refresh", protect, async (req, res) => {
  const dashboard = await buildDashboard(req, { forceAiRefresh: true });
  await saveDashboardData(req.user._id, "ai_refresh", "Refreshed live AI advice", {
    aiSource: dashboard.aiSource,
    aiLive: dashboard.aiLive,
    generatedAt: dashboard.aiGeneratedAt
  });
  await Activity.create({
    user: req.user._id,
    action: "Refreshed",
    detail: `AI advice updated (${dashboard.aiSource}).`,
    category: "assistant"
  });

  res.json({
    message: dashboard.aiLive
      ? "Live AI advice refreshed from your latest profile data."
      : "Fallback AI advice refreshed (add OPENAI_API_KEY for live model advice).",
    dashboard
  });
});

router.post("/workout/start", protect, async (req, res) => {
  const dashboard = await buildDashboard(req);
  await saveDashboardData(req.user._id, "workout_start", "Started workout", {
    workoutTitle: dashboard.workoutTitle,
    workoutDuration: dashboard.workoutDuration,
    clickedAt: new Date()
  });
  await Activity.create({
    user: req.user._id,
    action: "Started",
    detail: `${dashboard.workoutTitle}.`,
    category: "workout"
  });

  res.json({
    message: "Workout started. Timer and checklist are active.",
    dashboard: await buildDashboard(req)
  });
});

router.post("/meal", protect, async (req, res) => {
  const { mealName, calories, protein } = req.body;

  if (!mealName || !calories) {
    return res.status(400).json({ message: "Meal name and calories are required" });
  }

  await saveDashboardData(req.user._id, "meal_log", "Logged meal", {
    mealName,
    calories: Number(calories),
    protein: Number(protein || 0),
    clickedAt: new Date()
  });
  await Activity.create({
    user: req.user._id,
    action: "Logged",
    detail: `${mealName} with ${calories} kcal${protein ? ` and ${protein}g protein` : ""}.`,
    category: "nutrition"
  });

  res.json({
    message: "Meal logged successfully.",
    dashboard: await buildDashboard(req)
  });
});

router.post("/progress/check", protect, async (req, res) => {
  await saveDashboardData(req.user._id, "progress_check", "Checked weekly progress", {
    clickedAt: new Date()
  });
  await Activity.create({
    user: req.user._id,
    action: "Checked",
    detail: "weekly progress report.",
    category: "progress"
  });

  res.json({
    message: "Progress refreshed from your latest dashboard data.",
    dashboard: await buildDashboard(req)
  });
});

router.post("/schedule/view", protect, async (req, res) => {
  await saveDashboardData(req.user._id, "schedule_view", "Viewed schedule", {
    clickedAt: new Date()
  });
  await Activity.create({
    user: req.user._id,
    action: "Viewed",
    detail: "today's smart schedule.",
    category: "schedule"
  });

  res.json({
    message: "Schedule opened.",
    dashboard: await buildDashboard(req)
  });
});

router.post("/interaction", protect, async (req, res) => {
  const { eventType, label, payload } = req.body;

  if (!eventType || !label) {
    return res.status(400).json({ message: "Event type and label are required" });
  }

  const savedData = await saveDashboardData(req.user._id, eventType, label, payload || {});

  res.json({
    message: "Dashboard data saved to MongoDB.",
    saved: true,
    savedData: {
      eventType: savedData.eventType,
      label: savedData.label,
      payload: savedData.payload,
      createdAt: savedData.createdAt
    }
  });
});

router.put("/preferences", protect, async (req, res) => {
  const {
    goal,
    wakeTime,
    workoutTime,
    sleepTime,
    preferredWorkout,
    experienceLevel,
    availableMinutes,
    workoutDays,
    mealPreference,
    hydrationGoal,
    currentWeight,
    targetWeight,
    height,
    sleepHours,
    activityLevel,
    equipmentAccess,
    primaryChallenge,
    age,
    occupation,
    dietaryPreference,
    schedulePreference,
    stressLevel,
    stepGoal,
    focusArea
  } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.goal = goal || user.goal;
  user.preferences = {
    wakeTime: wakeTime || user.preferences?.wakeTime || "07:00",
    workoutTime: workoutTime || user.preferences?.workoutTime || "18:00",
    sleepTime: sleepTime || user.preferences?.sleepTime || "22:30",
    preferredWorkout: preferredWorkout || user.preferences?.preferredWorkout || "Strength",
    experienceLevel: experienceLevel || user.preferences?.experienceLevel || "Beginner",
    availableMinutes: Number(availableMinutes) || user.preferences?.availableMinutes || 38,
    workoutDays: Number(workoutDays) || user.preferences?.workoutDays || 4,
    mealPreference: mealPreference || user.preferences?.mealPreference || "Balanced",
    hydrationGoal: Number(hydrationGoal) || user.preferences?.hydrationGoal || 3,
    currentWeight: Number(currentWeight) || user.preferences?.currentWeight || null,
    targetWeight: Number(targetWeight) || user.preferences?.targetWeight || null,
    height: Number(height) || user.preferences?.height || null,
    sleepHours: Number(sleepHours) || user.preferences?.sleepHours || null,
    activityLevel: activityLevel || user.preferences?.activityLevel || "",
    equipmentAccess: equipmentAccess || user.preferences?.equipmentAccess || "",
    primaryChallenge: primaryChallenge || user.preferences?.primaryChallenge || "",
    age: Number(age) || user.preferences?.age || null,
    occupation: occupation || user.preferences?.occupation || "",
    dietaryPreference: dietaryPreference || user.preferences?.dietaryPreference || "",
    schedulePreference: schedulePreference || user.preferences?.schedulePreference || "",
    stressLevel: stressLevel || user.preferences?.stressLevel || "",
    stepGoal: Number(stepGoal) || user.preferences?.stepGoal || null,
    focusArea: focusArea || user.preferences?.focusArea || ""
  };

  await user.save();

  await saveDashboardData(user._id, "preferences_update", "Updated dashboard preferences", {
    goal: user.goal,
    preferences: user.preferences,
    clickedAt: new Date()
  });
  await Activity.create({
    user: user._id,
    action: "Updated",
    detail: "personal fitness preferences and schedule.",
    category: "preferences"
  });

  req.user = user;
  res.json({
    message: "Your personalized dashboard has been updated.",
    dashboard: await buildDashboard(req)
  });
});

module.exports = router;
