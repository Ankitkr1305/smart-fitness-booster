const mongoose = require("mongoose");

const dashboardDataSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    eventType: {
      type: String,
      required: true,
      trim: true
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    source: {
      type: String,
      default: "dashboard"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("DashboardData", dashboardDataSchema);
