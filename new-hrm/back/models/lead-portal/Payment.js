const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead", // Lead model se relation
      required: true,
    },

    amountPaid: {
      type: Number,
      min: 0,
    },

    paymentMode: {
      type: String,
      enum: ["cash", "upi", "card", "bank_transfer"],
    },

    // Ye field optional bhi rakh sakte ho
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "failed"],
      default: "pending",
    },
    finalPrice:{
            type:Number,
            required:true,
            trim:true,
            min:0
        },
        joinDate:{
            type:Date,
            default : null
        }
  },
  {
    timestamps: true, // createdAt & updatedAt auto banega
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;