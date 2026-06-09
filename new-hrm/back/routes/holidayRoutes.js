const router = require("express").Router();
const {
  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
} = require("../controllers/personalOffice/holidayController");

const auth = require("../middleware/authMiddleware");
const { enforceModuleAccess } = require("../middleware/moduleAccess.js");

router.post("/holiday", auth, enforceModuleAccess("holiday"), createHoliday);
router.get("/holiday", auth, enforceModuleAccess("holiday"), getHolidays);
router.put("/holiday/:id", auth, enforceModuleAccess("holiday"), updateHoliday);
router.delete("/holiday/:id", auth, enforceModuleAccess("holiday"), deleteHoliday);

module.exports = router;