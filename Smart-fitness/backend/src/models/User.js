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
      },
      currentWeight: {
        type: Number,
        default: null
      },
      targetWeight: {
        type: Number,
        default: null
      },
      height: {
        type: Number,
        default: null
      },
      sleepHours: {
        type: Number,
        default: null
      },
      activityLevel: {
        type: String,
        default: ""
      },
      equipmentAccess: {
        type: String,
        default: ""
      },
      primaryChallenge: {
        type: String,
        default: ""
      },
      age: {
        type: Number,
        default: null
      },
      occupation: {
        type: String,
        default: ""
      },
      dietaryPreference: {
        type: String,
        default: ""
      },
      schedulePreference: {
        type: String,
        default: ""
      },
      stressLevel: {
        type: String,
        default: ""
      },
      stepGoal: {
        type: Number,
        default: null
      },
      focusArea: {
        type: String,
        default: ""
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
