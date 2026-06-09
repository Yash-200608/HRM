const epxress = require("express");
const router = epxress.Router();
const payRollController = require("../controllers/personalOffice/payRollController");
const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/checkPermission");
router.post("/add",
 authMiddleware,
 checkPermission("payroll","create"),
 payRollController.createSalary); // Admin: Create a new salary record
router.get("/get",
 authMiddleware,
 checkPermission("payroll","view"),
 payRollController.getAllSalaries); // Admin: Get all salary records
router.get("/getbyid/:employeeId", payRollController.getSalaryByEmployee); // Employee & Admin: Get salary by employeeId

module.exports = router;