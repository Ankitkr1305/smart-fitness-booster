const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Activity = require("../models/Activity");
const DashboardData = require("../models/DashboardData");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

function getTodayDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function getDayDifference(previousDateString, currentDateString) {
  if (!previousDateString) {
    return null;
  }

  const previousDate = new Date(`${previousDateString}T00:00:00`);
  const currentDate = new Date(`${currentDateString}T00:00:00`);
  return Math.round((currentDate - previousDate) / 86400000);
}

async function updateLoginStreak(user) {
  const today = getTodayDateString();
  const dayDifference = getDayDifference(user.lastLoginDate, today);

  if (dayDifference === null) {
    user.streak = Math.max(user.streak || 1, 1);
    user.totalLoginDays = Math.max(user.totalLoginDays || 1, 1);
    user.lastLoginDate = today;
    await user.save();
    return;
  }

  if (dayDifference === 0) {
    return;
  }

  if (dayDifference === 1) {
    user.streak += 1;
    user.totalLoginDays += 1;
  } else {
    user.streak = 1;
    user.totalLoginDays += 1;
  }

  user.lastLoginDate = today;
  await user.save();
}

function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "smart_tracker_secret", {
    expiresIn: "7d"
  });
}

function userResponse(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    goal: user.goal,
    plan: user.plan,
    streak: user.streak
  };
}

async function trackLoginEvent(user, method = "password") {
  try {
    await DashboardData.create({
      user: user._id,
      eventType: "user_login",
      label: "User logged in",
      payload: {
        method,
        streak: user.streak,
        totalLoginDays: user.totalLoginDays,
        loggedAt: new Date()
      },
      source: "auth"
    });

    await Activity.create({
      user: user._id,
      action: "Logged in",
      detail: `Login via ${method}.`,
      category: "auth"
    });
  } catch (error) {
    console.error("Login tracking failed:", error.message);
  }
}

router.post("/signup", async (req, res) => {
  try {
    const { fullName, email, password, goal } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Full name, email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Account already exists. Please login." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      goal: goal || "Stay active",
      lastLoginDate: getTodayDateString(),
      streak: 1,
      totalLoginDays: 1
    });

    await trackLoginEvent(user, "signup");

    res.status(201).json({
      message: "Account created successfully",
      token: createToken(user._id),
      user: userResponse(user)
    });
  } catch (error) {
    res.status(500).json({ message: "Signup failed", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Email/username and password are required" });
    }

    const user = await User.findOne({ email: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid login details" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid login details" });
    }

    await updateLoginStreak(user);
    await trackLoginEvent(user, "password");

    res.json({
      message: "Login successful",
      token: createToken(user._id),
      user: userResponse(user)
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

router.post("/social-login", async (req, res) => {
  try {
    const { provider, email, fullName } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const authProvider = String(provider || "Google").trim();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const generatedPassword = await bcrypt.hash(`${authProvider}-${normalizedEmail}-${Date.now()}`, 10);
      user = await User.create({
        fullName: fullName || normalizedEmail.split("@")[0] || `${authProvider} User`,
        email: normalizedEmail,
        password: generatedPassword,
        goal: "Stay active",
        lastLoginDate: getTodayDateString(),
        streak: 1,
        totalLoginDays: 1
      });
      await trackLoginEvent(user, `${authProvider.toLowerCase()}_signup`);
    } else {
      await updateLoginStreak(user);
      await trackLoginEvent(user, authProvider.toLowerCase());
    }

    res.json({
      message: `${authProvider} login successful`,
      token: createToken(user._id),
      user: userResponse(user)
    });
  } catch (error) {
    res.status(500).json({ message: "Social login failed", error: error.message });
  }
});

router.get("/me", protect, (req, res) => {
  res.json({ user: userResponse(req.user) });
});

module.exports = router;
