import React, { useEffect, useState } from "react";
import axios from "@/lib/axios";

const ResignationManagement = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [remarkMap, setRemarkMap] = useState<{ [key: string]: string }>({});

  // 🔁 FETCH ALL
  const fetchData = async () => {
    try {
      setLoading(true);

     const res = await axios.get("/api/resignation");


const responseData = Array.isArray(res.data)
  ? res.data
  : Array.isArray(res.data?.data)
  ? res.data.data
  : [];

setData(responseData);
    } catch (err) {
      console.error("FETCH ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🔄 UPDATE STATUS + REMARK
  const update = async (id: string, status: string) => {
    try {
      setUpdatingId(id);

      const res = await axios.put(`/api/resignation/${id}`, {
        status,
        remarks: remarkMap[id] || "",
      });

      // ✅ Update UI instantly
      setData((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, ...res.data } : item
        )
      );

      // clear textarea
      setRemarkMap((prev) => ({ ...prev, [id]: "" }));

    } catch (err: any) {
      console.error("UPDATE ERROR:", err);
      alert(err?.response?.data?.message || "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  if (!Array.isArray(data) || data.length === 0) {
    return <div style={{ padding: 20 }}>No resignations found</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>Resignation Management</h2>

      {data.map((item) => (
        <div
          key={item._id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 15,
            marginBottom: 15,
            background: "#fff",
          }}
        >
          {/* 👤 EMPLOYEE */}
          <h3>{item.employeeId?.fullName || "N/A"}</h3>
          <p style={{ color: "#666" }}>{item.employeeId?.email}</p>

          {/* 📄 DETAILS */}
          <p><b>Reason:</b> {item.reason}</p>
          <p>
            <b>Last Working Date:</b>{" "}
            {new Date(item.lastWorkingDate).toDateString()}
          </p>

          {/* 📊 STATUS */}
          <p>
            <b>Status:</b>{" "}
            <span
              style={{
                color:
                  item.status === "APPROVED"
                    ? "green"
                    : item.status === "REJECTED"
                    ? "red"
                    : "orange",
                fontWeight: "bold",
              }}
            >
              {item.status}
            </span>
          </p>

          {/* 📝 EXISTING REMARK */}
          {item.remarks && (
            <p style={{ marginTop: 5 }}>
              <b>Remark:</b> {item.remarks}
            </p>
          )}

          {/* ✏️ INPUT REMARK (ONLY IF PENDING) */}
          {item.status === "PENDING" && (
            <>
              <textarea
                placeholder="Add remark (optional)"
                value={remarkMap[item._id] || ""}
                onChange={(e) =>
                  setRemarkMap((prev) => ({
                    ...prev,
                    [item._id]: e.target.value,
                  }))
                }
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: 8,
                  borderRadius: 5,
                  border: "1px solid #ccc",
                }}
              />

              {/* 🔘 ACTION BUTTONS */}
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => update(item._id, "APPROVED")}
                  disabled={updatingId === item._id}
                  style={{
                    marginRight: 10,
                    background: "green",
                    color: "#fff",
                    padding: "6px 12px",
                    border: "none",
                    borderRadius: 5,
                    opacity: updatingId === item._id ? 0.6 : 1,
                  }}
                >
                  {updatingId === item._id ? "Updating..." : "Approve"}
                </button>

                <button
                  onClick={() => update(item._id, "REJECTED")}
                  disabled={updatingId === item._id}
                  style={{
                    background: "red",
                    color: "#fff",
                    padding: "6px 12px",
                    border: "none",
                    borderRadius: 5,
                    opacity: updatingId === item._id ? 0.6 : 1,
                  }}
                >
                  Reject
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default ResignationManagement;