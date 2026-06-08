const PayRoll = require("../../models/personalOffice/payRollModel.js");
const Department = require("../../models/personalOffice/departmentModel.js");
const Company = require("../../models/personalOffice/companyModel.js");
const { EmployeeHistory } = require("../../models/personalOffice/EmployeeHistoryModel.js");
const { Employee } = require("../../models/personalOffice/employeeModel.js");

/* helper */
const totalAmount = (arr = []) =>
  arr.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

/* =======================================================
   ADMIN : CREATE SALARY
======================================================= */
const createSalary = async (req, res) => {
  try {
    const {
      employeeId,
      month,
      year,
      basic,
      departmentId,
      companyId,
      earningCategories = [],
      deductionCategories = []
    } = req.body;

    if (
      !employeeId ||
      !month ||
      !year ||
      basic == null ||
      !departmentId ||
      !companyId
    ) {
      return res.status(400).json({
        message: "employeeId, month, year, basic, departmentId, companyId required"
      });
    }

    /* company */
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    /* employee */
    const employee = await Employee.findOne({
      _id: employeeId,
      createdBy: companyId
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (employee.status === "RELIEVED") {
      return res.status(403).json({
        message: "Employee already relieved"
      });
    }

    /* department */
    const department = await Department.findById(departmentId);

    if (!department) {
      return res.status(404).json({
        message: "Department not found"
      });
    }

    /* totals */
    const allowance = totalAmount(earningCategories);
    const deductions = totalAmount(deductionCategories);

    const basicNum = Number(basic) || 0;
    const netSalary = basicNum + allowance - deductions;

    /* prevent duplicate same month */
    const already = await PayRoll.findOne({
      employeeId,
      month,
      year,
      createdBy: companyId
    });

    if (already) {
      return res.status(409).json({
        message: "Salary slip already exists for this month"
      });
    }

    /* create salary */
    const newSalary = await PayRoll.create({
      employeeId,
      month,
      year,
      basic: basicNum,
      allowance,
      deductions,
      earningCategories,
      deductionCategories,
      departmentId: department._id,
      createdBy: company._id
    });

    /* history */
    const oldSalary = Number(employee.monthSalary) || 0;

    if (oldSalary !== netSalary) {
      await EmployeeHistory.create({
        employeeId,
        eventType: "SALARY_CHANGE",
        oldData: { monthSalary: oldSalary },
        newData: { monthSalary: netSalary },
        remarks: `Salary created for ${month}-${year}`,
        changedBy: company._id
      });
    }

    /* update employee current salary */
    employee.monthSalary = netSalary;
    await employee.save();

    res.status(201).json({
      message: "Salary slip created successfully",
      data: newSalary
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =======================================================
   ADMIN : GET ALL SALARIES
======================================================= */
const getAllSalaries = async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: "companyId required" });
    }

    const salaries = await PayRoll.find({
      createdBy: companyId
    })
      .populate({
        path: "employeeId",
        model: "Employee",
        select: "fullName designation email"
      })
      .populate({
        path: "departmentId",
        model: "Department",
        select: "name"
      })
      .sort({ createdAt: -1 });

    res.status(200).json(salaries);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =======================================================
   EMPLOYEE / ADMIN : GET BY EMPLOYEE
======================================================= */
const getSalaryByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: "companyId required" });
    }

    const salaries = await PayRoll.find({
      employeeId,
      createdBy: companyId
    })
      .populate({
        path: "employeeId",
        model: "Employee",
        select: "fullName designation email"
      })
      .populate({
        path: "departmentId",
        model: "Department",
        select: "name"
      })
      .sort({ createdAt: -1 });

    res.status(200).json(salaries);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createSalary,
  getAllSalaries,
  getSalaryByEmployee
};