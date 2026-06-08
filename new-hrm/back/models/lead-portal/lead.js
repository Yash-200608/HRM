const mongoose = require("mongoose");

// Define the schema
const leadSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            lowercase: true,
            trim: true
        },
        phone: {
            type: String,
            trim: true,
            unique: true
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
        },
        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
            default: null,
        },

        price: {
            type: Number,
            min: 0
        },
        source: {
            type: String,
            trim: true,
            default: "Website"
        },
        status: {
            type: String,
            enum: ["new", "interested", "contacted", "enrolled", "lost", "demo", "inDemo"],
            default: "new"
        },

    },
    { timestamps: true } // createdAt and updatedAt
);

// Export the model
module.exports = mongoose.model("Lead", leadSchema);