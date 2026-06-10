const Role = require("../../models/personalOffice/roleModel");
const {
  normalizeRoleName,
  deduplicateRoles,
} = require("../../utils/roleUtils");
const { recordSecurityAudit } = require("../../service/securityAuditService.js");

async function findDuplicateRole(companyId, roleName, excludeId = null) {
  const roles = await Role.find({ companyId }).select("_id roleName");
  const normalizedName = normalizeRoleName(roleName);

  return roles.find((role) => {
    if (excludeId && role._id.toString() === excludeId.toString()) {
      return false;
    }
    return normalizeRoleName(role.roleName) === normalizedName;
  });
}

const createRole = async (req, res) => {
  try {
    const { companyId, roleName, permissions, createdBy } = req.body;

    if (!companyId || !roleName?.trim() || !createdBy) {
      return res.status(400).json({
        message: "companyId, roleName, and createdBy are required",
      });
    }

    const duplicate = await findDuplicateRole(companyId, roleName);
    if (duplicate) {
      return res.status(400).json({
        message: "A role with this name already exists",
      });
    }

    const role = await Role.create({
      companyId,
      roleName: roleName.trim(),
      permissions,
      createdBy,
    });

    await recordSecurityAudit("auth.role.created", req, {
      resourceType: "role",
      resourceId: role._id,
      companyId,
      metadata: { roleName: role.roleName },
    });

    res.status(201).json(role);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

const getRoles = async (req, res) => {
  try {
    const { companyId } = req.params;

    const data = await Role.find({ companyId }).sort({ createdAt: -1 });

    res.json(deduplicateRoles(data));
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.roleName !== undefined) {
      updates.roleName = String(updates.roleName).trim();

      const existingRole = await Role.findById(id);
      if (!existingRole) {
        return res.status(404).json({ message: "Role not found" });
      }

      const duplicate = await findDuplicateRole(
        existingRole.companyId,
        updates.roleName,
        id
      );

      if (duplicate) {
        return res.status(400).json({
          message: "A role with this name already exists",
        });
      }
    }

    const updated = await Role.findByIdAndUpdate(id, updates, { new: true });

    if (!updated) {
      return res.status(404).json({ message: "Role not found" });
    }

    await recordSecurityAudit("auth.role.updated", req, {
      resourceType: "role",
      resourceId: updated._id,
      companyId: updated.companyId,
      metadata: { roleName: updated.roleName },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

const deleteRole = async (req, res) => {
  try {
    const deleted = await Role.findByIdAndDelete(req.params.id);
    if (deleted) {
      await recordSecurityAudit("auth.role.deleted", req, {
        resourceType: "role",
        resourceId: deleted._id,
        companyId: deleted.companyId,
        metadata: { roleName: deleted.roleName },
      });
    }
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createRole,
  getRoles,
  updateRole,
  deleteRole,
};