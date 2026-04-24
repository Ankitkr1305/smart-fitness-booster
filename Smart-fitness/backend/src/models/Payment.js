const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: "INR"
    },
    customerName: {
      type: String,
      default: "Guest"
    },
    customerEmail: {
      type: String,
      default: ""
    },
    gateway: {
      type: String,
      default: "razorpay"
    },
    mode: {
      type: String,
      enum: ["demo", "razorpay", "upi_qr"],
      default: "demo"
    },
    orderId: {
      type: String,
      required: true
    },
    paymentId: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["created", "pending", "paid", "failed"],
      default: "created"
    },
    upiLink: {
      type: String,
      default: ""
    },
    qrCodeDataUrl: {
      type: String,
      default: ""
    },
    utrNumber: {
      type: String,
      default: ""
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
