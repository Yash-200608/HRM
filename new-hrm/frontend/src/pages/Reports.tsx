import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Users, Clock, Receipt, Wallet, TrendingUp, ArrowLeft, Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { getAnalyticsReportPage, getAttendanceReportPage } from "@/services/Service";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Helmet } from "react-helmet-async";
import { useNavigate } from 'react-router-dom';
import { getCurrentWeek } from '@/services/allFunctions';
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/hooks/hook';
import { getReport } from '@/redux-toolkit/slice/allPage/reportSlice';
import { getAttendanceReport } from '@/redux-toolkit/slice/allPage/attendanceSlice';


const Reports: React.FC = () => {

  const { user } = useAuth();
const companyId =
  typeof user?.companyId === "object"
    ? user?.companyId?._id
    : user?.companyId;
  const canViewReports =
  (user as any)?.role === "admin" ||
  (user as any )?.assignedRole?.permissions?.reports?.view;

  const { toast } = useToast();
  const [week, setWeek] = useState("");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [pageLoading, setPageLoading] = useState(false);
  const analyticsData = useAppSelector((state) => state.report.report);
  const attendanceSummary = useAppSelector((state) => state.attendance.attendanceReport);
  const isFirstLoad = useRef(true);

  const handleGetAttendanceReport = async (currentWeek) => {
    setPageLoading(true);
    try {

      if (!user?._id || !companyId) return toast({ title: "Error", description: "userId or companyId is missing.", variant: "destructive" });

      const res = await getAttendanceReportPage(
  user?._id,
  companyId,
  currentWeek
);

      if (res.status === 200) {
        // setAttendanceSummary(res?.data?.summary)

        dispatch(getAttendanceReport(res?.data?.summary));
      }
    }
    catch (err) {
      console.log(err);
    }
    finally {
      setPageLoading(false);
    }
  };


  const handleGetReport = async () => {
    try {

      if (!user?._id || !companyId) return toast({ title: "Error", description: "userId or companyId is missing.", variant: "destructive" });
      setPageLoading(true);
   const res = await getAnalyticsReportPage(
  user?._id,
  companyId
);
      if (res.status === 200) {
        dispatch(getReport(res?.data?.summary));
      }
    }
    catch (err) {
      console.log(err);
    }
    finally {
      setPageLoading(false);
    }
  };
  useEffect(() => {
  if (
    canViewReports &&
    (!analyticsData || Object.keys(analyticsData).length === 0)
  ) {
    handleGetReport();
  }
}, [canViewReports, analyticsData, user?._id, companyId]);

 useEffect(() => {
  if (!canViewReports) return;
  if (!user?._id || !companyId) return;

  if (!week) {
    const currentWeek = getCurrentWeek();
    setWeek(currentWeek);
    handleGetAttendanceReport(currentWeek);
    isFirstLoad.current = false;
    return;
  }

  handleGetAttendanceReport(week);

}, [week, canViewReports, user?._id, companyId]);





  const attendanceData = attendanceSummary?.map(day => ({
    name: day.name,       // Mon, Tue, etc.
    present: day.present,
    absent: day.absent,
  }));


  const expenseData = analyticsData?.expenseGrouped?.map((expense) => ({
    name: new Date(expense?._id?.year, expense?._id?.month - 1).toLocaleString("en-US", {
      month: "short"   // "Jan", "Feb", etc
    }),
    amount: expense?.totalExpense
  }))


  const taskDistribution = [
    { name: 'Completed', value: analyticsData?.taskSummary?.completed ?? 0, color: 'hsl(142, 76%, 36%)' },
    { name: 'In Progress', value: analyticsData?.taskSummary?.active ?? 0, color: 'hsl(38, 92%, 50%)' },
    { name: 'Pending', value: analyticsData?.taskSummary?.pending ?? 0, color: 'hsl(215, 16%, 47%)' },
  ];

  const departmentPerformance = analyticsData?.departmentAnalytics?.map((v) => {
    return (
      { name: v?.departmentName, tasks: v?.completedTaskPercentage, attendance: v?.attendancePercentage }
    )
  })


  if (pageLoading && (attendanceSummary.length === 0 || !analyticsData || Object.keys(analyticsData).length === 0)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Report Page</title>
        <meta name="description" content="This is the home page of our app" />
      </Helmet>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 md:mt-[-35px]">
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className='cursor-pointer' onClick={() => { navigate("/users") }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                  <p className="text-xl font-bold">{analyticsData?.totalEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className='cursor-pointer' onClick={() => { navigate("/attendances") }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Clock className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Attendance</p>
                  <p className="text-xl font-bold">{analyticsData?.attendancePercentage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className='cursor-pointer' onClick={() => { navigate("/expenses") }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Receipt className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-xl font-bold">₹{analyticsData?.expenseThisMonth}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className='cursor-pointer' onClick={() => { navigate("/payrolls") }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Wallet className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Payroll</p>
                  <p className="text-xl font-bold">₹{analyticsData?.payrollThisMonth}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center w-full">
                {/* Left side: icon + text */}
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span>Weekly Attendance</span>
                </div>

                {/* Right side: input */}
                <input
                  type="week"
                  value={week}
                  onChange={(e) => setWeek(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                  style={{ minWidth: "110px" }} // ensure week input shows properly
                />
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="present" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Expense Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Expense Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={expenseData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Task Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {taskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {taskDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Department Performance */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Task Completion %" />
                    <Bar dataKey="attendance" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} name="Attendance %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Reports;
