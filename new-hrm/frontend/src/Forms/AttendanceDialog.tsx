import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button"; // your Button component
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"; // your Select components
import { Input } from "@/components/ui/input"; // your Input component
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getEmployees, getAttendancebyday, updateAttendancebyday, AbsentAddAttendancebyday } from "@/services/Service";
import { Loader2 } from "lucide-react";
import { useAppSelector } from "@/redux-toolkit/hooks/hook";
import { socket } from "@/socket/socket";

type Employee = {
  id: string;
  name: string;
};

interface AttendanceFormProps {
  setAttendanceRefresh: (value) => void;
  onClose: () => void;
  isOpen: boolean;
}
const today = new Date();
const currentDate = today.toISOString().split("T")[0];

const AttendanceForm: React.FC<AttendanceFormProps> = ({ setAttendanceRefresh, onClose, isOpen }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const dateRef = useRef(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(currentDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  // const[employeeList, setEmployeeList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAbsentLoading, setIsAbsentLoading] = useState(false);
  
  const employeeList = useAppSelector((state) => state.user.employees);
  const [attendanceId, setAttendanceId] = useState("");

  

  const handleSubmit = async () => {
    if (!employeeId || !startTime || !endTime) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" }); return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      toast({ title: "Invalid Time", description: "End time must be after start time", variant: "destructive" }); return;
    }
    setIsLoading(true);
   let obj = {
  attendanceId,
  clockInTime: `${date}T${startTime}:00`,
  clockOutTime: `${date}T${endTime}:00`,
};
    // if (!obj?.companyId || !obj?.adminId || !obj?.date || !obj?.userId || !obj?.startTime || !obj?.endTime) return toast({ title: "Error", description: "required data missing.", variant: "destructive" })
    try {
      const res = await updateAttendancebyday(obj);
      if (res.status === 200) {
        socket.emit("addAttendanceRefresh");
        toast({ title: "Updated Attendance.", description: res.data?.message });
        setAttendanceRefresh((prev) => prev + 1);
        setDate(currentDate);
        setEmployeeId("");
        setStartTime("");
        setEndTime("");
        onClose();
      }
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error", description: err?.response?.data?.message || err?.message || err?.response?.data, variant: "destructive" }); return;

    }
    finally {
      setIsLoading(false);
    }

  };

  const handleAbsent = async (e) => {
    e.preventDefault();
    if (!date || !employeeId || !user?._id || !user?.companyId?._id) return;
    let obj = { companyId: user?.companyId?._id, adminId: user?._id, date: date, userId: employeeId };
    try {
      setIsAbsentLoading(true);
      const res = await AbsentAddAttendancebyday(obj);
      console.log(res);
      if (res.status === 200) {
        setAttendanceRefresh((prev) => prev + 1);
        setDate(currentDate);
        setEmployeeId("");
        setStartTime("");
        setEndTime("");
        onClose();
      }
    }
    catch (err) {
      console.log(err);
    } finally {
      setIsAbsentLoading(false);
    }
  }

const handleGetAttendance = async () => {

  const selectedDate = new Date(date);

  const obj = {
    companyId: user?.companyId?._id,
    userId: employeeId,
    month: selectedDate.getMonth() + 1,
    year: selectedDate.getFullYear(),
  };

  try {

    const res = await getAttendancebyday(obj);

    console.log("FULL RESPONSE", res.data);

    const selectedRecord =
      res.data.records?.find((record) => {

        const recordDate =
          new Date(record.attendanceDate)
            .toISOString()
            .split("T")[0];

        return recordDate === date;

      });

    console.log(
      "FOUND RECORD =>",
      selectedRecord
    );

    if (selectedRecord) {

        console.log(
    "RECORD ID =>",
    selectedRecord._id
  );
      setAttendanceId(
        selectedRecord._id
      );

      setStartTime(
        selectedRecord.clockInTime
          ? new Date(
              selectedRecord.clockInTime
            )
              .toTimeString()
              .slice(0, 5)
          : ""
      );

      setEndTime(
        selectedRecord.clockOutTime
          ? new Date(
              selectedRecord.clockOutTime
            )
              .toTimeString()
              .slice(0, 5)
          : ""
      );

      console.log(
        "ATTENDANCE ID =>",
        selectedRecord._id
      );
    }

  } catch (err) {

    console.log(err);

  }
};
  useEffect(() => {
    if (!employeeId) return;

    handleGetAttendance();
  }, [employeeId]);

  if (isOpen !== true) return;

  console.log({
  attendanceId,
  clockInTime: `${date}T${startTime}:00`,
  clockOutTime: `${date}T${endTime}:00`,
});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 🔹 Background Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 🔹 Modal Content */}
      <div className="relative z-50 w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Update Attendance</h2>

        {/* Start Date*/}
        <div className="mb-4">
          <label className="block mb-1 font-medium">Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onClick={() => { if (dateRef.current?.showPicker) { dateRef.current.showPicker() } }}
          />
        </div>

        {/* Employee Select */}
        <div className="mb-4">
          <label className="block mb-1 font-medium">Employee</label>
          <Select value={employeeId} onValueChange={setEmployeeId} >
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent className="max-h-48 overflow-y-auto">
              {employeeList.map((emp) => (
                <SelectItem key={emp._id} value={emp._id}>
                  {emp.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Start Date & Time */}
        <div className="mb-4">
          <label className="block mb-1 font-medium">Start Time</label>
          <Input
            ref={startDateRef}
            type="time"
            value={startTime}
            disabled={!employeeId}
            onChange={(e) => setStartTime(e.target.value)}
            onClick={() => { if (startDateRef.current?.showPicker) { startDateRef.current.showPicker() } }}
          />
          {!employeeId && <p className="text-xs text-red-400">Please Employee Select First.</p>}
        </div>

        {/* End Date & Time */}
        <div className="mb-4">
          <label className="block mb-1 font-medium">End Time</label>
          <Input
            ref={endDateRef}
            type="time"
            value={endTime}
            disabled={!employeeId}
            onChange={(e) => setEndTime(e.target.value)}
            onClick={() => { if (endDateRef.current?.showPicker) { endDateRef.current.showPicker() } }}
          />
          {!employeeId && <p className="text-xs text-red-400">Please Employee Select First.</p>}

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAbsent} disabled={!employeeId || !date || isAbsentLoading}>
            {isAbsentLoading && <Loader2 className="md:w-4 md:h-4 w-5 h-5" />}
            {isAbsentLoading ? "Absent..." : "Absent"}
          </Button>

          <Button onClick={handleSubmit} disabled={!employeeId || !startTime || !endTime || isLoading}>
            {isLoading && <Loader2 className="md:w-4 md:h-4 w-5 h-5" />}
            {isLoading ? "Updating..." : "Update"}
          </Button>
        </div>
      </div>
    </div>
  );

};

export default AttendanceForm;
