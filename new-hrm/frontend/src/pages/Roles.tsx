import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Roles() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [roles, setRoles] = useState<any[]>([]);
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState<any>({});
  const [editId, setEditId] = useState("");
  const [loading, setLoading] = useState(false);

 const modules = [
"dashboard",
"employees",
"attendance",
"leave",
"departments",
"expenses",
"payroll",
"reports",
"roles",
"setting",
"tasks",
"jobportal",
"leadportal",
"Resignation",
"attendancereport",
"holiday",
"tasks_dashboard",
"projects",
"tasks",
"subtasks",
"overdue_tasks",
"task_manager",
"job_dashboard",
"job_companies",
"jobs",
"job_applications",
"job_candidates",
"job_revenue",
"job_settings",
"job_roles",
"lead_list",
"lead_orders",
"lead_products",
];

  const actions = ["view", "create", "edit", "delete"];

  // =========================
  // Load Roles
  // =========================
  const loadRoles = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/assignroles/list/${
          user.companyId?._id
        }`
      );

      setRoles(res.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  // =========================
  // Toggle Checkbox
  // =========================
  const togglePermission = (module: string, action: string) => {
    setPermissions((prev: any) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev?.[module]?.[action],
      },
    }));
  };

  // =========================
  // Create / Update Role
  // =========================
  const saveRole = async () => {
    try {
      if (!roleName.trim()) {
        alert("Enter role name");
        return;
      }

      setLoading(true);

      if (editId) {
        await axios.put(
          `${import.meta.env.VITE_API_URL}/api/assignroles/update/${editId}`,
          {
            roleName,
            permissions,
          }
        );
      } else {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/assignroles/create`,
          {
            companyId: user.companyId?._id,
            createdBy: user._id,
            roleName,
            permissions,
          }
        );
      }

      setRoleName("");
      setPermissions({});
      setEditId("");

      loadRoles();
    } catch (error) {
      console.log(error);
      alert("Failed");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // Edit Role
  // =========================
  const editRole = (role: any) => {
    setRoleName(role.roleName);
    setPermissions(role.permissions || {});
    setEditId(role._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // =========================
  // Delete Role
  // =========================
  const deleteRole = async (id: string) => {
    try {
      const ok = window.confirm("Delete this role?");
      if (!ok) return;

      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/assignroles/delete/${id}`
      );

      loadRoles();
    } catch (error) {
      console.log(error);
    }
  };

  // =========================
  // Cancel Edit
  // =========================
  const cancelEdit = () => {
    setEditId("");
    setRoleName("");
    setPermissions({});
  };

  return (
    <div className="p-6">
      {/* Header */}
      <h1 className="text-3xl font-bold mb-6">Roles & Permissions</h1>

      {/* Form */}
      <div className="bg-white border rounded-xl p-5 shadow-sm mb-8">
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            className="border rounded px-4 py-2 w-[280px]"
            placeholder="Enter Role Name"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
          />

          <button
            onClick={saveRole}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded"
          >
            {loading
              ? "Saving..."
              : editId
              ? "Update Role"
              : "Create Role"}
          </button>

          {editId && (
            <button
              onClick={cancelEdit}
              className="bg-gray-500 text-white px-5 py-2 rounded"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Permission Grid */}
        <h2 className="font-semibold text-lg mb-4">Select Permissions</h2>

        <div className="space-y-3">
          {modules.map((module) => (
            <div
              key={module}
              className="grid grid-cols-5 gap-3 border-b pb-3 items-center"
            >
              <div className="font-medium capitalize">{module}</div>

              {actions.map((action) => (
                <label
                  key={action}
                  className="flex items-center gap-2 text-sm capitalize"
                >
                  <input
                    type="checkbox"
                    checked={permissions?.[module]?.[action] || false}
                    onChange={() => togglePermission(module, action)}
                  />
                  {action}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Roles List */}
      <h2 className="text-2xl font-bold mb-4">Created Roles</h2>

      {roles.length === 0 && (
        <div className="text-gray-500">No roles created yet.</div>
      )}

      <div className="space-y-5">
        {roles.map((role: any) => (
          <div
            key={role._id}
            className="bg-white border rounded-xl p-5 shadow-sm"
          >
            {/* Top */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{role.roleName}</h3>

              <div className="flex gap-2">
                <button
                  onClick={() => editRole(role)}
                  className="bg-yellow-500 text-white px-4 py-2 rounded"
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteRole(role._id)}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Permissions */}
            <div className="grid md:grid-cols-2 gap-3">
              {Object.keys(role.permissions || {}).map((module) => {
                const allowed = Object.keys(
                  role.permissions[module] || {}
                ).filter((k) => role.permissions[module][k]);

                if (allowed.length === 0) return null;

                return (
                  <div
                    key={module}
                    className="border rounded p-3 bg-gray-50"
                  >
                    <div className="font-semibold capitalize mb-1">
                      {module}
                    </div>

                    <div className="text-sm text-gray-700">
                      {allowed.join(", ")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}