const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({

    leadId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lead",
    }],

    sender: {
        type: String,
        enum: ["admin", "user"],
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
    },

    message: {
        type: String,
    },
    time:{
      type:Date,
      default: null
    },

    fromWhatsApp: {
        type: Boolean,
        default:false
    },
    media:{
        type:String,
        default:null
    },
     type:{
        type:String,
        default:null
    }

}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);