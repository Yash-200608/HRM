const epxress = require("express");
const router = epxress.Router();
const payRollController = require("../controllers/personalOffice/payRollController");
const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/checkPermission");
const { enforceModuleAccess } = require("../middleware/moduleAccess.js");

const payrollAccess = enforceModuleAccess("payroll");

router.post("/add",
 authMiddleware,
 payrollAccess,
 checkPermission("payroll","create"),
 payRollController.createSalary); // Admin: Create a new salary record
router.get("/get",
 authMiddleware,
 payrollAccess,
 checkPermission("payroll","view"),
 payRollController.getAllSalaries); // Admin: Get all salary records
router.get(
  "/getbyid/:employeeId",
  authMiddleware,
  payrollAccess,
  (req, res, next) => {
    if (String(req.user.id) === String(req.params.employeeId)) {
      return next();
    }
    return checkPermission("payroll", "view")(req, res, next);
  },
  payRollController.getSalaryByEmployee
);

module.exports = router;