import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";

type Props = {
  user: any;
  attendanceUIState: string;
  todayAttendance: any;
  handleClockIn: () => void;
  handleClockOut: () => void;
  clockActionLoading:boolean
};




export default function AttendanceActionCard({
  user,
  attendanceUIState,
  todayAttendance,
  handleClockIn,
  handleClockOut,
  clockActionLoading,
}: Props) {
  if (user?.role !== "employee") return null;

const formatTime = (time?: string) => {
  if (!time || time === "-") return "-";

  return new Date(time).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {attendanceUIState === "WORKING"
              ? "Currently Working"
              : "Today's Attendance"}
          </h2>

         <p className="text-muted-foreground">
  {attendanceUIState === "WORKING" &&
    <>
  Clocked in at {formatTime(todayAttendance?.clockInTime)}
</>}

  {attendanceUIState === "DAY_COMPLETED" && (
    <>
      Status: {todayAttendance?.status} | Hours: {todayAttendance?.hoursWorked}
    </>
  )}

  {attendanceUIState === "DAY_MISSED" &&
    "You were marked absent today"}

  {attendanceUIState === "NO_RECORD" &&
    new Date().toLocaleDateString("en-IN")}
</p>
        </div>

        {attendanceUIState === "NO_RECORD" && (
          <Button onClick={handleClockIn} disabled={clockActionLoading}>
            <LogIn className="w-4 h-4 mr-2" />
            {clockActionLoading
    ? "Processing..."
    : "Clock In"}
          </Button>
        )}

        {attendanceUIState === "WORKING" && (
         <Button
  disabled={clockActionLoading}
  variant="destructive"
  onClick={handleClockOut}
>
  {clockActionLoading
    ? "Processing..."
    : "Clock Out"}
</Button>
        )}

        {attendanceUIState === "DAY_COMPLETED" && (
          <Button disabled>Day Completed</Button>
        )}

        {attendanceUIState === "DAY_MISSED" && (
          <Button disabled>Absent</Button>
        )}
      </CardContent>
    </Card>
  );
}