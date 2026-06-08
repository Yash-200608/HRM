import React, { useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Download,
  X,
  Building2,
  Calendar,
  CreditCard,
  BadgeIndianRupee,
} from "lucide-react";

const SalarySlipCard = ({ data, onClose }) => {
  const slipRefs = useRef([]);

  const dataArray = Array.isArray(data) ? data : [data];

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const downloadPDF = async (index) => {
    const input = slipRefs.current[index];
    if (!input) return;

    const canvas = await html2canvas(input, {
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    const employeeName =
      dataArray[index]?.employeeId?.fullName || "Employee";

    pdf.save(`${employeeName}_Salary_Slip.pdf`);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 flex justify-center items-start overflow-y-auto p-4"
    >
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl relative overflow-hidden">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Salary Slip Preview
            </h2>
            <p className="text-sm text-slate-500">
               Payroll salary slip
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {dataArray.map((item, index) => {
            const earnings =
              (item.basic || 0) + (item.allowance || 0);

            const totalDeductions = item.deductions || 0;

            const netSalary = earnings - totalDeductions;

            return (
              <div
                key={item._id || index}
                ref={(el) => (slipRefs.current[index] = el)}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
              >
              

{/* ================= COMPANY HEADER ================= */}

<div className="border-b border-slate-200">
  <div className="px-10 py-8 bg-white">
    <div className="flex flex-col lg:flex-row lg:justify-between gap-8">
      
      {/* LEFT */}
      <div className="flex gap-4">
        {/* LOGO */}
        <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-800">
          X
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-wide text-slate-800">
            XNTROVA TECHNOLOGIES
          </h1>

          <p className="text-slate-500 mt-1 text-sm">
            Software Development & Digital Solutions
          </p>

          <div className="mt-4 text-sm text-slate-600 leading-6">
            <p>A107, 2nd Floor, Sector 8, Dwarka New Delhi - 110077</p>            
            <p>xntrova@gmail.com</p>
            <p>+91 868-382-8646</p>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 min-w-[260px]">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
          Salary Slip
        </p>

        <h2 className="text-2xl font-bold text-slate-800 capitalize">
          {item.month} {item.year}
        </h2>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Generated On</span>

            <span className="font-medium text-slate-700">
              {new Date().toLocaleDateString("en-IN")}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Payment Status</span>

            <span className="font-semibold text-green-600">
              Paid
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

{/* ================= EMPLOYEE DETAILS ================= */}

<div className="px-10 py-8">
  <div className="border border-slate-200 rounded-2xl overflow-hidden">
    
    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
      <h3 className="text-lg font-semibold text-slate-800">
        Employee Details
      </h3>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      
      <div className="p-6 border-b lg:border-b-0 lg:border-r border-slate-200">
        <p className="text-xs uppercase text-slate-500 mb-2">
          Employee Name
        </p>

        <h4 className="font-semibold text-slate-800 text-lg">
          {item.employeeId?.fullName || "N/A"}
        </h4>
      </div>

      <div className="p-6 border-b lg:border-b-0 lg:border-r border-slate-200">
        <p className="text-xs uppercase text-slate-500 mb-2">
          Employee ID
        </p>

        <h4 className="font-semibold text-slate-800 text-lg">
          EMP-
          {item.employeeId?._id
            ?.slice(-6)
            ?.toUpperCase() || "N/A"}
        </h4>
      </div>

      <div className="p-6 border-b lg:border-b-0 lg:border-r border-slate-200">
        <p className="text-xs uppercase text-slate-500 mb-2">
          Department
        </p>

        <h4 className="font-semibold text-slate-800 text-lg">
          {item.departmentId?.name || "N/A"}
        </h4>
      </div>

      <div className="p-6">
        <p className="text-xs uppercase text-slate-500 mb-2">
          Designation
        </p>

        <h4 className="font-semibold text-slate-800 text-lg">
          {item.employeeId?.designation || "N/A"}
        </h4>
      </div>
    </div>
  </div>
</div>

{/* ================= SALARY BREAKDOWN ================= */}

<div className="px-10">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    
    {/* EARNINGS */}
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      
      <div className="bg-green-50 border-b border-green-100 px-6 py-4">
        <h3 className="text-xl font-semibold text-green-700">
          Earnings
        </h3>
      </div>

      <div>
        <div className="flex justify-between px-6 py-4 border-b">
          <span className="text-slate-700">
            Basic Salary
          </span>

          <span className="font-semibold text-slate-800">
            ₹{formatCurrency(item.basic)}
          </span>
        </div>

        {item.earningCategories?.map((earn, i) => (
          <div
            key={i}
            className="flex justify-between px-6 py-4 border-b"
          >
            <span className="text-slate-700">
              {earn.name}
            </span>

            <span className="font-semibold text-green-700">
              ₹{formatCurrency(earn.amount)}
            </span>
          </div>
        ))}

        <div className="flex justify-between px-6 py-5 bg-green-50">
          <span className="font-bold text-green-700">
            Total Earnings
          </span>

          <span className="font-bold text-green-700 text-lg">
            ₹{formatCurrency(earnings)}
          </span>
        </div>
      </div>
    </div>

    {/* DEDUCTIONS */}
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      
      <div className="bg-red-50 border-b border-red-100 px-6 py-4">
        <h3 className="text-xl font-semibold text-red-700">
          Deductions
        </h3>
      </div>

      <div className=" ">
        {item.deductionCategories?.length > 0 ? (
          item.deductionCategories.map((ded, i) => (
            <div
              key={i}
              className="flex justify-between px-6 py-4 border-b"
            >
              <span className="text-slate-700">
                {ded.name}
              </span>

              <span className="font-semibold text-red-600">
                ₹{formatCurrency(ded.amount)}
              </span>
            </div>
          ))
        ) : (
          <div className="px-6 py-4 text-slate-500 border-b">
            No deductions added
          </div>
        )}

        <div className="flex justify-between px-6 py-5 bg-red-50">
          <span className="font-bold text-red-700">
            Total Deductions
          </span>

          <span className="font-bold text-red-700 text-lg">
            ₹{formatCurrency(totalDeductions)}
          </span>
        </div>
      </div>
    </div>
  </div>
</div>

{/* ================= NET SALARY ================= */}

<div className="px-10 py-8">
  <div className="border-2 border-slate-800 rounded-2xl overflow-hidden">
    
    <div className="bg-slate-800 text-white px-8 py-5">
      <p className="uppercase tracking-wider text-sm text-slate-300">
        Net Salary Payable
      </p>

      <h2 className="text-3xl font-bold mt-2">
        ₹{formatCurrency(netSalary)}
      </h2>
    </div>

    <div className="bg-slate-50 px-8 py-5 flex flex-col md:flex-row md:justify-between gap-5">
      
      <div>
        <p className="text-sm text-slate-500">
          Payment Method
        </p>

        <h4 className="font-semibold text-slate-800 mt-1">
          Bank Transfer
        </h4>
      </div>

      <div>
        <p className="text-sm text-slate-500">
          Payment Status
        </p>

        <h4 className="font-semibold text-green-600 mt-1">
          Successfully Paid
        </h4>
      </div>

      <div>
        <p className="text-sm text-slate-500">
          Payslip Generated By
        </p>

        <h4 className="font-semibold text-slate-800 mt-1">
          Xntrova HRM
        </h4>
      </div>
    </div>
  </div>
</div>

{/* ================= FOOTER ================= */}

<div className="px-10 pb-10">
  <div className="flex flex-col lg:flex-row justify-between gap-6 items-center">
    
    <div className="text-sm text-slate-500 leading-6">
      <p>
        This is a computer generated payslip and does not require signature.
      </p>

      <p>
        For payroll queries contact xntrova@gmail.com
      </p>
    </div>

    <button
      onClick={() => downloadPDF(index)}
      className="bg-slate-800 hover:bg-slate-900 transition-all duration-300 text-white px-8 py-4 rounded-xl font-semibold shadow-md flex items-center gap-3"
    >
      <Download className="w-5 h-5" />

      Download Salary Slip
    </button>
  </div>
</div>




              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default SalarySlipCard;