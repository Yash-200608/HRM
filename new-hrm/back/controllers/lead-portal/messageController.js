const Message = require("../../models/lead-portal/message");
const Lead = require("../../models/lead-portal/lead");
const { getIO } = require("../../socketHelpers");
const uploadToCloudinary = require("../../cloudinary/uploadToCloudinary");
const mongoose = require("mongoose");

const addMessage = async (req, res) => {
  try {
    const { leadId, userId, message } = req.body;
    const io = getIO();
    const file = req.files;

    let leadIds = [];
    if (Array.isArray(leadId)) {
      leadIds = leadId;
    } else if (typeof leadId === "string") {
      leadIds = leadId.includes(",")
        ? leadId.split(",").map(id => id.trim())
        : [leadId.trim()];
    }

    // 2️⃣ Validate ObjectIds
    const validLeadIds = leadIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (!validLeadIds.length) return res.status(400).json({ message: "No valid leadId provided" });

    // 3️⃣ Fetch leads from DB
    const leads = await Lead.find({ _id: { $in: validLeadIds } });
    if (!leads?.length) return res.status(404).json({ message: "Lead(s) not found" });

    // 4️⃣ Extract phones and remove duplicates & nulls
    const phones = [...new Set(leads.map(lead => lead?.phone).filter(Boolean))];
    if (!phones.length) return res.status(400).json({ message: "No valid phone numbers found." });

    // 5️⃣ Handle media upload (optional)
    let mediaUrl = null;
    let mediaType = null;
    if (file?.media?.[0]?.buffer) {
      mediaUrl = await uploadToCloudinary(file.media[0].buffer, file.media[0].mimetype);
      mediaType = file.media[0].mimetype;
    }


    // 7️⃣ Save message in DB with leadId array
    const msg = await Message.create({
      leadId: validLeadIds, // always array
      sender: "admin",
      userId,
      message,
      time: new Date(),
      fromWhatsApp: false,
      media: mediaUrl,
      type: mediaType
    });

    // 8️⃣ Emit to frontend
    io.emit("new-message", msg);

    res.status(200).json({ success: true, msg, count: phones.length });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err?.message || "Something went wrong." });
  }
};

const getMessages = async (req, res) => {
  try {
    const { leadId } = req.query;
    if (!leadId) return res.status(400).json({ message: "LeadId Not Found." })
    const messageData = await Message.find({ leadId: leadId });
    return res.status(200).json({ messageData });
  }
  catch (err) {
    res.status(500).json({ message: err?.message });
  }
}



const sendMultipleUserMessage = async (req, res) => {
  try {
    const { userId, leadId, message } = req.body;
    const file = req.files;

    // 1️⃣ Input validation
    if (!userId || !leadId?.length || !(message || file)) {
      return res.status(400).json({ message: "userId, leadIds or content data are missing." });
    }

    // 2️⃣ Fetch leads
    const leads = await Lead.find({ _id: { $in: leadId } });
    if (!leads?.length) return res.status(404).json({ message: "No Lead Found." });

    // 3️⃣ Extract phones (remove duplicates & nulls)
    const phones = [...new Set(leads.map(lead => lead?.phone).filter(Boolean))];
    if (!phones.length) return res.status(400).json({ message: "No valid phone numbers found." });

    // 4️⃣ Handle media upload
    let mediaUrl = null;
    let mediaType = null; 
    if (file?.media?.[0]?.buffer) {
      mediaUrl = await uploadToCloudinary(file?.media?.[0]?.buffer, file?.media?.[0]?.mimetype);
      mediaType = file?.media?.[0]?.mimetype;
    }

    // 5️⃣ Batch send logic
    const batchSize = 20; // 20 users per batch (adjust if needed)
    const delayBetweenBatches = 2000; // 2 seconds delay


      // save in DB
    const msg = await Message.create({
      leadId,
      sender: "admin",
      userId: userId,
      message,
      time: new Date(),
      fromWhatsApp: false,
      media: mediaUrl,
      type: mediaType
    });

    // emit to frontend
    io.emit("new-message", msg);

    res.json({ success: true, msg });

    return res.status(200).json({ message: "Messages sent successfully", count: phones.length });
  }
  catch (err) {
    console.error(err);
    return res.status(500).json({ message: err?.message || "Something went wrong." });
  }
};


module.exports = { addMessage, getMessages }