import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useEffect, useMemo, useState } from "react";

import { addPayRoll, getEmployees } from "@/services/Service";

import { Loader2 } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

import {
  useAppDispatch,
  useAppSelector,
} from "@/redux-toolkit/hooks/hook";

import { getEmployeeList } from "@/redux-toolkit/slice/allPage/userSlice";

import { socket } from "@/socket/socket";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const generateYears = (numPastYears = 5) => {
  const currentYear = new Date().getFullYear();

  const years = [];

  for (let i = 0; i <= numPastYears; i++) {
    years.push((currentYear - i).toString());
  }

  return years;
};

const years = generateYears(5);

export default function GeneratePayslipDialog({
  open,
  onOpenChange,
  setSalarySlipRefresh,
  initialData,
}) {
  const { user } = useAuth();

  const { toast } = useToast();

  const dispatch = useAppDispatch();

  const employees = useAppSelector(
    (state) => state.user.employees
  );

  const [loading, setLoading] = useState(false);

  const [obj, setObj] = useState({
    employeeId: "",
    month: "",
    year: "",
    basic: "",
    departmentId: "",
  });

  const [earnings, setEarnings] = useState([
    { name: "", amount: "" },
  ]);

  const [deductionList, setDeductionList] = useState([
    { name: "", amount: "" },
  ]);

  const isEditMode = Boolean(initialData);

  const canManagePayroll =
    user?.role === "admin" ||
    (user as any)?.assignedRole?.permissions?.payroll?.create;

  // =========================
  // LIVE CALCULATIONS
  // =========================

  const totalEarnings = useMemo(() => {
    return earnings.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
  }, [earnings]);

  const totalDeductions = useMemo(() => {
    return deductionList.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
  }, [deductionList]);

  const grossSalary =
    Number(obj.basic || 0) + totalEarnings;

  const netSalary =
    grossSalary - totalDeductions;

  // =========================
  // GET EMPLOYEES
  // =========================

  useEffect(() => {
    if (canManagePayroll && employees.length === 0) {
      handleGetEmployees();
    }
  }, []);

  useEffect(() => {
    socket.on("getEmployeeRefresh", () => {
      handleGetEmployees();
    });

    return () => {
      socket.off("getEmployeeRefresh");
    };
  }, []);

  const handleGetEmployees = async () => {
    try {
      const companyId =
        user?.companyId?._id || user?.companyId;

      let data = [];

      if (canManagePayroll) {
        data = await getEmployees(companyId);
      }

      if (Array.isArray(data)) {
        dispatch(getEmployeeList(data));
      }
    } catch (err) {
      console.log(err);
    }
  };

  // =========================
  // EDIT MODE
  // =========================

  useEffect(() => {
    if (initialData) {
      setObj({
        employeeId: initialData.employeeId || "",
        month: initialData.month || "",
        year: initialData.year || "",
        basic: initialData.basic || "",
        departmentId:
          initialData.department?._id || "",
      });
    }
  }, [initialData]);

  // =========================
  // COMMON CHANGE
  // =========================

  const handleChange = (key, value) => {
    setObj((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // =========================
  // EMPLOYEE SELECT
  // =========================

  const handleEmployeeSelect = (employeeId) => {
  const emp = employees.find(
    (e) => e._id === employeeId
  );

  if (emp) {
    setObj((prev) => ({
      ...prev,
      employeeId: emp._id,
      departmentId: emp.department?._id || "",
      basic: String(emp.monthSalary || 0),
    }));
  }
};

  // =========================
  // SUBMIT
  // =========================

  const handleSubmit = async (
    e?: React.FormEvent
  ) => {
    e.preventDefault();

    setLoading(true);

    let response = null;

    try {
      const filteredEarnings = earnings.filter(
        (item) => item.name && item.amount
      );

      const filteredDeductions =
        deductionList.filter(
          (item) => item.name && item.amount
        );

      const payload = {
  employeeId: obj.employeeId,

  month: obj.month,

  year: obj.year,

  basic: Number(obj.basic),

  departmentId: obj.departmentId,

  companyId:
    user?.companyId?._id ||
    user?.companyId ||
    user?.createdBy?._id ||
    user?.createdBy,

  grossSalary,

  netSalary,

   earningCategories: filteredEarnings,

        deductionCategories:
          filteredDeductions,
};



console.log("PAYROLL PAYLOAD", payload);

response = await addPayRoll(payload);

      if (
        response.status === 201 ||
        response.status === 200
      ) {
        socket.emit("addPayrollRefresh");

        toast({
          title: isEditMode
            ? "Payslip Updated"
            : "Payslip Generated",

          description:
            "Payroll generated successfully.",
        });

        setSalarySlipRefresh(true);

        onOpenChange(false);

        setObj({
          employeeId: "",
          month: "",
          year: "",
          basic: "",
          departmentId: "",
        });

        setEarnings([
          { name: "", amount: "" },
        ]);

        setDeductionList([
          { name: "", amount: "" },
        ]);
      }
    } catch (error) {
      console.log(error);

      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          "Something went wrong",

        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? "Update Salary Slip"
              : "Generate Salary Slip"}
          </DialogTitle>

          <DialogDescription>
            Create a salary slip for employee.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-6 mt-4"
          onSubmit={handleSubmit}
        >
          {/* EMPLOYEE */}

          <div className="space-y-2">
            <Label>Employee</Label>

            <Select
              value={obj.employeeId}
              onValueChange={
                handleEmployeeSelect
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>

              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem
                    key={emp._id}
                    value={emp._id}
                  >
                    {emp.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* MONTH YEAR */}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Month</Label>

              <Select
                value={obj.month}
                onValueChange={(value) =>
                  handleChange(
                    "month",
                    value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>

                <SelectContent>
                  {months.map((month) => (
                    <SelectItem
                      key={month}
                      value={month.toLowerCase()}
                    >
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>

              <Select
                value={obj.year}
                onValueChange={(value) =>
                  handleChange(
                    "year",
                    value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>

                <SelectContent>
                  {years.map((year) => (
                    <SelectItem
                      key={year}
                      value={year}
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* BASIC */}

          <div className="space-y-2">
            <Label>
              Basic Salary (₹)
            </Label>

            <Input
              type="number"
              value={obj.basic}
              onChange={(e) =>
                handleChange(
                  "basic",
                  e.target.value
                )
              }
              placeholder="Employee monthly salary"
            />

            <p className="text-xs text-muted-foreground">
              Auto-filled from employee
              profile
            </p>
          </div>

          {/* EARNINGS */}

          <div className="space-y-3">
            <Label>
              Additional Earnings
              (Bonus / Overtime /
              Incentives)
            </Label>

            {earnings.map(
              (item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-2 gap-2"
                >
                  <Input
                    placeholder="Bonus / Overtime"
                    value={item.name}
                    onChange={(e) => {
                      const arr = [
                        ...earnings,
                      ];

                      arr[index].name =
                        e.target.value;

                      setEarnings(arr);
                    }}
                  />

                  <Input
                    type="number"
                    placeholder="Amount"
                    value={item.amount}
                    onChange={(e) => {
                      const arr = [
                        ...earnings,
                      ];

                      arr[index].amount =
                        e.target.value;

                      setEarnings(arr);
                    }}
                  />
                </div>
              )
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setEarnings([
                  ...earnings,
                  {
                    name: "",
                    amount: "",
                  },
                ])
              }
            >
              + Add Earning
            </Button>
          </div>

          {/* DEDUCTIONS */}

          <div className="space-y-3">
            <Label>
              Deductions (PF / Tax /
              Loan)
            </Label>

            {deductionList.map(
              (item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-2 gap-2"
                >
                  <Input
                    placeholder="PF / Tax"
                    value={item.name}
                    onChange={(e) => {
                      const arr = [
                        ...deductionList,
                      ];

                      arr[index].name =
                        e.target.value;

                      setDeductionList(arr);
                    }}
                  />

                  <Input
                    type="number"
                    placeholder="Amount"
                    value={item.amount}
                    onChange={(e) => {
                      const arr = [
                        ...deductionList,
                      ];

                      arr[index].amount =
                        e.target.value;

                      setDeductionList(arr);
                    }}
                  />
                </div>
              )
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setDeductionList([
                  ...deductionList,
                  {
                    name: "",
                    amount: "",
                  },
                ])
              }
            >
              + Add Deduction
            </Button>
          </div>

          {/* SUMMARY */}

          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <h3 className="font-semibold text-lg">
              Salary Summary
            </h3>

            <div className="flex justify-between">
              <span>
                Basic Salary
              </span>

              <span>
                ₹{" "}
                {Number(
                  obj.basic || 0
                ).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>
                Total Earnings
              </span>

              <span className="text-green-600">
                + ₹{" "}
                {totalEarnings.toFixed(
                  2
                )}
              </span>
            </div>

            <div className="flex justify-between">
              <span>
                Total Deductions
              </span>

              <span className="text-red-600">
                - ₹{" "}
                {totalDeductions.toFixed(
                  2
                )}
              </span>
            </div>

            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Net Salary</span>

              <span>
                ₹{" "}
                {netSalary.toFixed(2)}
              </span>
            </div>
          </div>

          {/* ACTIONS */}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onOpenChange(false)
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                loading ||
                !obj.employeeId ||
                !obj.basic ||
                !obj.month ||
                !obj.year
              }
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Payslip"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}