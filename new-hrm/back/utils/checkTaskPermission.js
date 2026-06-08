const { Admin } = require("../models/personalOffice/authModel");
const { Employee } = require("../models/personalOffice/employeeModel");

const checkTaskPermission = async (
  userId,
  companyId,
  action = "view"
) => {

  // ADMIN
  const admin = await Admin.findOne({
    _id: userId,
    companyId
  });

  if (admin) {
    return {
      allowed: true,
      role: "admin",
      user: admin
    };
  }

  // EMPLOYEE
  const employee = await Employee.findOne({
    _id: userId,
    createdBy: companyId
  }).populate("assignedRole");

  if (!employee) {
    return {
      allowed: false
    };
  }

  const permissions =
    employee?.assignedRole?.permissions || {};

  const allowed =
    permissions?.tasks?.[action] === true;

  return {
    allowed,
    role: "employee",
    user: employee,
    permissions
  };
};

module.exports = checkTaskPermission;