const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    action: {
      type: String,
      required: true
    },
    detail: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: "general"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);
