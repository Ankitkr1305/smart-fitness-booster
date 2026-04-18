const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    goal: {
      type: String,
      default: "Stay active",
      trim: true
    },
    plan: {
      type: String,
      default: "Premium"
    },
    streak: {
      type: Number,
      default: 1
    },
    totalLoginDays: {
      type: Number,
      default: 1
    },
    lastLoginDate: {
      type: String,
      default: null
    },
    preferences: {
      wakeTime: {
        type: String,
        default: "07:00"
      },
      workoutTime: {
        type: String,
        default: "18:00"
      },
      sleepTime: {
        type: String,
        default: "22:30"
      },
      preferredWorkout: {
        type: String,
        default: "Strength"
      },
      experienceLevel: {
        type: String,
        default: "Beginner"
      },
      availableMinutes: {
        type: Number,
        default: 38
      },
      workoutDays: {
        type: Number,
        default: 4
      },
      mealPreference: {
        type: String,
        default: "Balanced"
      },
      hydrationGoal: {
        type: Number,
        default: 3
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
