const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const authRoutes = require("./src/routes/authRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const User = require("./src/models/User");
const Activity = require("./src/models/Activity");
const DashboardData = require("./src/models/DashboardData");

const localEnvPath = path.join(__dirname, ".env");
const envResult = dotenv.config({ path: localEnvPath });
const localEnv = envResult.parsed || {};

const app = express();
const PORT = Number(localEnv.PORT || process.env.PORT || 5000);
const MONGO_URI = localEnv.MONGO_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smart_tracker_booster";
const FRONTEND_ORIGIN = localEnv.FRONTEND_ORIGIN || process.env.FRONTEND_ORIGIN || `http://localhost:${PORT}`;
const frontendPath = path.join(__dirname, "..", "frontend");
let mongoConnectionPromise = null;

function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }

  if (!mongoConnectionPromise) {
    mongoConnectionPromise = mongoose.connect(MONGO_URI);
  }

  return mongoConnectionPromise;
}

async function requireDatabase(req, res, next) {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    res.status(500).json({
      message: "Database connection failed",
      error: error.message
    });
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || origin === FRONTEND_ORIGIN || origin === "null") {
        return callback(null, true);
      }
      return callback(null, true); // Allow all for local dev flexibility
    },
    credentials: true
  })
);
app.use(express.json());
app.use(express.static(frontendPath));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Smart Tracker Booster API is running" });
});

app.get("/api/debug/db-status", requireDatabase, async (req, res) => {
  try {
    const dbName = mongoose.connection?.db?.databaseName || "unknown";
    const [users, activities, dashboardEvents] = await Promise.all([
      User.countDocuments(),
      Activity.countDocuments(),
      DashboardData.countDocuments()
    ]);

    const latestUser = await User.findOne()
      .sort({ createdAt: -1 })
      .select("fullName email createdAt")
      .lean();

    res.json({
      connected: mongoose.connection.readyState === 1,
      dbName,
      counts: {
        users,
        activities,
        dashboardEvents
      },
      latestUser
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to read DB status",
      error: error.message
    });
  }
});

app.use("/api/auth", requireDatabase, authRoutes);
app.use("/api/dashboard", requireDatabase, dashboardRoutes);
app.use("/api/payments", requireDatabase, paymentRoutes);

app.get("/", (req, res) => {
  const indexFile = path.join(frontendPath, "index.html");
  if (!fs.existsSync(indexFile)) {
    return res.json({
      status: "ok",
      message: "Smart Tracker Booster backend is running"
    });
  }

  res.sendFile(indexFile);
});

if (require.main === module) {
  connectDatabase()
    .then(() => {
      console.log("MongoDB connected");
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error("MongoDB connection failed:", error.message);
      process.exit(1);
    });
}

module.exports = app;
