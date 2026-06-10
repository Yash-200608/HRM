const { Admin } = require("../../../models/personalOffice/authModel.js");
const { Employee } = require("../../../models/personalOffice/employeeModel.js");
const { SuperAdmin } = require("../../../models/personalOffice/superadminModel.js");
const Company = require("../../../models/personalOffice/companyModel.js");
const Department = require("../../../models/personalOffice/departmentModel.js");
const { getIO } = require("../../../socketHelpers.js");

/**
 * =========================================
 * ➕ ADD MANAGER (MULTIPLE ALLOWED)
 * =========================================
 */
const addManager = async (req, res) => {
  const { userId, companyId, obj } = req.body;
  const io = getIO();

  try {
    if (!userId || !companyId || !obj?.employeeIds?.length || !obj?.department) {
      return res.status(400).json({ message: "Required data missing." });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    let user = await Admin.findOne({ _id: userId, companyId });

    if (!user) {
      user = await SuperAdmin.findOne({ _id: userId });
      if (!user) {
        user = await Employee.findOne({
          _id: userId,
          createdBy: companyId
        }).populate("assignedRole");

        if (!user) {
          return res.status(403).json({
            message: "Unauthorized access."
          });
        }

        const permissions =
          user?.assignedRole?.permissions || {};

        const hasPermission =
          permissions?.task_manager?.create === true ||
          permissions?.tasks?.create === true;

        if (!hasPermission) {
          return res.status(403).json({
            message: "You do not have permission to manage managers."
          });
        }
      }
      // super admin: user is set, proceed without permission check
    }

    const department = await Department.findOne({ _id: obj.department, createdBy: companyId });

    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    };

    department.managers = obj.employeeIds;

    io.emit("managerListRefresh");
    await department.save();

    return res.status(200).json({
      message: "Managers updated successfully.",
      department,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};
/**
 * =========================================
 * 📄 GET MANAGERS (GROUPED BY DEPARTMENT)
 * =========================================
 */
const getManagers = async (req, res) => {
  const { userId, companyId } = req.query;

  try {
    if (!userId || !companyId) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // ✅ COMPANY CHECK (RESTORED)
    const company = await Company.findOne({ _id: companyId });
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    // validate admin or super or employee with perm
    let user = await Admin.findOne({ _id: userId, companyId });
    if (!user) {
      user = await SuperAdmin.findOne({ _id: userId });
      if (!user) {
        user = await Employee.findOne({ _id: userId, createdBy: companyId }).populate("department", "name managers");

        if (!user) {
          return res.status(403).json({
            message: "Unauthorized access."
          });
        }

        await user.populate("assignedRole");

        const permissions =
          user?.assignedRole?.permissions || {};

        const hasPermission =
          permissions?.task_manager?.view === true ||
          permissions?.tasks?.view === true;

        if (!hasPermission) {
          return res.status(403).json({
            message: "Unauthorized access."
          });
        }
      }
      // super admin: allow
    }


    const departments = await Department.find({ createdBy: companyId })
      .populate({
        path: "managers",
        select: "fullName email profileImage designation",
        populate: {
          path: "department",
          select: "name"
        }
      });


    return res.status(200).json({ managers: departments });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


/**
 * =========================================
 * 🔄 UPDATE MANAGER (REPLACE ALL)
 * =========================================
 */
const updateManager = async (req, res) => {
  const { userId, companyId, obj } = req.body;
  const io = getIO();

  try {
    if (!userId || !companyId || !obj?.employeeIds?.length || !obj?.department) {
      return res.status(400).json({ message: "Required data missing." });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

   let user = await Admin.findOne({ _id: userId, companyId });

   if (!user) {
     user = await SuperAdmin.findOne({ _id: userId });
     if (!user) {
       user = await Employee.findOne({
         _id: userId,
         createdBy: companyId
       }).populate("assignedRole");

       if (!user) {
         return res.status(403).json({
           message: "Unauthorized access."
         });
       }

       const permissions =
         user?.assignedRole?.permissions || {};

       const hasPermission =
         permissions?.task_manager?.create === true ||
         permissions?.tasks?.create === true;

       if (!hasPermission) {
         return res.status(403).json({
           message: "You do not have permission to manage managers."
         });
       }
     }
     // super admin: proceed
   }

    const department = await Department.findOne({
      _id: obj.department,
      createdBy: companyId,
    });

    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    department.managers = obj.employeeIds;

    await department.save();
    io.to(userId).emit("managerListRefresh")

    return res.status(200).json({
      message: "Managers updated successfully.",
      department,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};


const deleteManager = async (req, res) => {
  const { userId, companyId, employeeId, departmentId } = req.query;

  try {
    if (!userId || !companyId || !employeeId || !departmentId) {
      return res.status(400).json({ message: "Required data missing." });
    }

    const company = await Company.findOne({ _id: companyId });
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }
   let user = await Admin.findOne({ _id: userId, companyId });

   if (!user) {
     user = await SuperAdmin.findOne({ _id: userId });
     if (!user) {
       user = await Employee.findOne({
         _id: userId,
         createdBy: companyId
       }).populate("assignedRole");

       if (!user) {
         return res.status(403).json({
           message: "Unauthorized access."
         });
       }

       const permissions =
         user?.assignedRole?.permissions || {};

       const hasPermission =
         permissions?.task_manager?.create === true ||
         permissions?.tasks?.create === true;

       if (!hasPermission) {
         return res.status(403).json({
           message: "You do not have permission to manage managers."
         });
       }
     }
     // super admin allowed
   }

    const department = await Department.findOne({ _id: departmentId, createdBy: companyId });

    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }
    department.managers = department.managers.filter((id) => id.toString() !== employeeId);

    await department.save();

    return res.status(200).json({
      message: "Manager removed successfully.",
      department,
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { addManager, getManagers, updateManager, deleteManager };