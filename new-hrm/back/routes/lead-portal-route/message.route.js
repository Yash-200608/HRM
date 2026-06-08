const router = require("express").Router();

const {addMessage, getMessages} = require("../../controllers/lead-portal/messageController");
const upload = require("../../middleware/upload");


router.post("/add",upload.fields([{name:"media", maxCount:1}]), addMessage);
router.get("/get", getMessages);

module.exports = router;