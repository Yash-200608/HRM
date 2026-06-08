const Role = require("../../models/job-portal/role");
const { Admin } = require("../../models/personalOffice/authModel.js");



// =============================
// 1️⃣ Add Role
// =============================
const addRole = async (req, res) => {
    try {
        const { name, description, isActive, userId } = req.body;
        const admin = await Admin.findById(userId);
        if (!admin) return res.status(400).json({ success: false, message: "You are not authorized to add a role.Plase Contact Admin." })

        const existingRole = await Role.findOne({ name });

        if (existingRole) {
            return res.status(400).json({
                success: false,
                message: "Role already exists. Please use another name.",
            });
        }

        const role = await Role.create({
            name,
            description,
            isActive,
            createdBy: userId,
        });

        res.status(201).json({
            success: true,
            message: "Role created successfully",
            data: role,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =============================
// 2️⃣ Get All Roles
// =============================
const getAllRoles = async (req, res) => {
    try {
        const roles = await Role.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: roles.length,
            data: roles,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =============================
// 3️⃣ Get Only Active Roles (Dropdown Use)
// =============================
const getActiveRoles = async (req, res) => {
    try {
        const roles = await Role.find({ isActive: true }).sort({ name: 1 });

        res.status(200).json({
            success: true,
            data: roles,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =============================
// 4️⃣ Get Single Role
// =============================
const getSingleRole = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: "Role not found",
            });
        }

        res.status(200).json({
            success: true,
            data: role,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =============================
// 5️⃣ Update Role
// =============================
const updateRole = async (req, res) => {
    try {

        const admin = await Admin.findById(req.body.userId);
        if (!admin) return res.status(400).json({ success: false, message: "You are not authorized to update a role.Plase Contact Admin." })


        const role = await Role.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!role) {
            return res.status(404).json({
                success: false,
                message: "Role not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Role updated successfully",
            data: role,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =============================
// 6️⃣ Soft Delete Role (Deactivate)
// =============================
const deleteRole = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: "Role not found",
            });
        }

        role.isActive = false;
        await role.save();

        res.status(200).json({
            success: true,
            message: "Role deactivated successfully",
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =============================
// 7️⃣ Toggle Role Status (Activate/Deactivate)
// =============================
const toggleRoleStatus = async (req, res) => {
    const { id, status } = req.body;
    try {
        const role = await Role.findById(id);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: "Role not found",
            });
        }

        role.isActive = status;
        await role.save();

        res.status(200).json({
            success: true,
            message: `Role ${status ? "activated" : "deactivated"} successfully`,
            data: role,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


module.exports = {
    addRole, getAllRoles, getActiveRoles, getSingleRole, updateRole, deleteRole, toggleRoleStatus
}