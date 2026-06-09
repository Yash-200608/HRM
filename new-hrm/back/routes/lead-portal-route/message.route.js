const router = require("express").Router();
const { createPortalGuards } = require("../../middleware/portalGuards.js");
const { addMessage, getMessages } = require("../../controllers/lead-portal/messageController");
const upload = require("../../middleware/upload");

const { access, mutation } = createPortalGuards("leadportal");

router.post("/add", mutation, access, upload.fields([{ name: "media", maxCount: 1 }]), addMessage);
router.get("/get", access, getMessages);

module.exports = router;