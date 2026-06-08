import React, { useEffect, useState } from "react";
import axios from "@/lib/axios";

const Resignation = () => {
  const [data, setData] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const res = await axios.get("api/resignation/me");
      setData(res.data || null);
    } catch {
      setData(null);
    }
  };

  useEffect(() => {
    fetchData();

    // 🔥 polling (optional, can remove later if using socket)
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // 🔥 Prefill on rejected
  useEffect(() => {
    if (data?.status === "REJECTED") {
      setReason(data.reason || "");
      setDate(data.lastWorkingDate?.split("T")[0] || "");
    }
  }, [data]);

  const submit = async () => {
    if (!reason || !date) {
      alert("All fields required");
      return;
    }

    try {
      setLoading(true);

      await axios.post("api/resignation", {
        reason,
        lastWorkingDate: date,
      });

      setReason("");
      setDate("");

      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  // 🎯 STATUS BADGE
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      case "APPROVED":
        return "bg-green-100 text-green-700";
      case "REJECTED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // ============================
  // ✅ STATUS VIEW (NOT REJECTED)
  // ============================
  if (data && data.status !== "REJECTED") {
    return (
      <div className="p-6 max-w-xl">
        <h1 className="text-2xl font-bold mb-4">Your Resignation</h1>

        <div className="bg-white p-5 rounded-xl shadow border">
          <p><b>Reason:</b> {data.reason}</p>

          <p>
            <b>Last Working Date:</b>{" "}
           {data?.lastWorkingDate
    ? new Date(data.lastWorkingDate).toDateString()
    : "Not selected"}
          </p>

          <p className="mt-2">
            <b>Status:</b>
            <span className={`ml-2 px-3 py-1 rounded-full text-sm ${getStatusBadge(data.status)}`}>
              {data.status}
            </span>
          </p>

          {/* 🔥 Admin remarks */}
          {data.remarks && (
            <p className="mt-3 text-sm text-gray-600">
              <b>Admin Remark:</b> {data.remarks}
            </p>
          )}
        </div>

        {/* Status messages */}
        {data.status === "APPROVED" && (
          <p className="mt-4 text-green-600 font-semibold">
             Your resignation has been approved
          </p>
        )}

        {data.status === "PENDING" && (
          <p className="mt-4 text-yellow-600 font-semibold">
            ⏳ Your resignation is under review
          </p>
        )}
      </div>
    );
  }

  // ============================
  // ✅ FORM VIEW (NEW + REJECTED)
  // ============================
  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-4">
        {data?.status === "REJECTED"
          ? "Resubmit Resignation"
          : "Submit Resignation"}
      </h1>

      {/* 🔥 Rejected message + remarks */}
      {data?.status === "REJECTED" && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600 font-semibold">
             Your resignation was rejected
          </p>

          {data.remarks && (
            <p className="text-sm text-gray-600 mt-1">
              <b>Reason:</b> {data.remarks}
            </p>
          )}
        </div>
      )}

      <div className="bg-white p-5 rounded-xl shadow border">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter your reason..."
          className="w-full border p-3 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border p-3 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          onClick={submit}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
};

export default Resignation;