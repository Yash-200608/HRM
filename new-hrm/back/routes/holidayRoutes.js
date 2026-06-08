const router = require("express").Router();
const {
  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
} = require("../controllers/personalOffice/holidayController");

const auth = require("../middleware/authMiddleware");

router.post("/holiday", auth, createHoliday);
router.get("/holiday", auth, getHolidays);
router.put("/holiday/:id", auth, updateHoliday);
router.delete("/holiday/:id", auth, deleteHoliday);

module.exports = router;