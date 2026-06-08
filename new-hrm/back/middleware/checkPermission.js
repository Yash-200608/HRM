const Role = require("../models/personalOffice/roleModel"); 
const { Employee } = require("../models/personalOffice/employeeModel");

module.exports = function checkPermission(moduleName, action = "view") {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // ✅ ADMIN / SUPER ADMIN BYPASS
      if (user.role === "admin" || user.role === "super_admin") {
        return next();
      }

      // ✅ STEP 1: FETCH EMPLOYEE
      const employee = await Employee.findById(user.id);

      if (!employee) {
        return res.status(404).json({
          message: "Employee not found"
        });
      }

      // ✅ STEP 2: FETCH ROLE FROM DB
      const role = await Role.findById(employee.assignedRole); // 👈 IMPORTANT FIELD

      if (!role) {
        return res.status(404).json({
          message: "Role not found"
        });
      }

      const permissions = role.permissions || {};


      // ✅ STEP 3: CHECK PERMISSION
      const allowed =
        permissions[moduleName] &&
        permissions[moduleName][action] === true;


      if (!allowed) {
        return res.status(403).json({
          message: "Access denied"
        });
      }


      next();

    } catch (err) {
      return res.status(500).json({
        message: "Permission error"
      });
    }
  };
};