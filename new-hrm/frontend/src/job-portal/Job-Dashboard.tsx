import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Briefcase, Users, LayoutDashboard, TrendingUp, ArrowUpRight, MoreHorizontal, Calendar, Search, Filter, Download, Bell, CheckCircle2, XCircle, Clock, ArrowLeft, Building2, } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, } from "recharts";
import { getDashboardSummary, getDashboardList, getDashboardOverview } from "@/services/Service";
import { useNavigate } from "react-router-dom";
import { getDashboardJobList, getDashboardSummaryData, getDashboardOverviewData, getDashboardPanelData } from "@/redux-toolkit/slice/job-portal/dashboardSlice";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";



const statusColors = [
  "#3b82f6", // blue
  "#f59e0b", // orange
  "#8b5cf6", // purple
  "#10b981", // green
  "#ef4444", // red
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#e11d48", // pink
];

const AdminJobDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const dashboardSummary = useAppSelector((state) => state?.dashboardJob?.dashboardSummary);
  const dashboardOverview = useAppSelector((state) => state?.dashboardJob?.dashboardOverview);
  const dashboardPanel = useAppSelector((state) => state?.dashboardJob?.dashboardPanel);
  const dashboardJobList = useAppSelector((state) => state?.dashboardJob?.dashboardJobList);
  const isMobile = window.innerWidth < 768;


  const candidateStatusData = [
    { name: "New Applied", value: dashboardPanel?.applied, color: "#3b82f6" }, // Blue
    { name: "Screening", value: dashboardPanel?.screening, color: "#8b5cf6" }, // Purple
    { name: "Interview", value: dashboardPanel?.interview, color: "#f59e0b" }, // Amber
    // { name: "Offer Sent", value: 200, color: "#10b981" }, 
    { name: "Shortlisted", value: dashboardPanel?.shortlisted, color: "#10b981" },
    { name: "Hired", value: dashboardPanel?.selected, color: "#059669" }, // Green
    { name: "Rejected", value: dashboardPanel?.rejected, color: "#ef4444" }, // Red
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Active</Badge>;
      case "Closed":
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-none">Closed</Badge>;
      case "Draft":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-none">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  // {getDashboardJobList, getDashboardSummaryData, getDashboardOverviewData, getDashboardPanelData}
  const handleGetDashboardSummary = async () => {
    try {
      const res = await getDashboardSummary();
      if (res.status === 200) {
        // setDashboardSummary(res.data)
        dispatch(getDashboardSummaryData(res?.data))
      }
    }
    catch (err) {
      console.log(err);
    }
  }


  const handleGetDashboardList = async () => {
    try {
      const res = await getDashboardList();
      if (res.status === 200) {
        // setDashboardJobList(res.data?.job)
        dispatch(getDashboardJobList(res?.data?.job))
      }
    }
    catch (err) {
      console.log(err);
    }
  }


  const handleGetDashboardOverview = async () => {
    try {
      const res = await getDashboardOverview();
      if (res.status === 200) {
        // setDashboardOverview(res.data?.monthly)
        // setDashboardPanel(res.data?.total)
        dispatch(getDashboardOverviewData(res.data?.monthly));
        dispatch(getDashboardPanelData(res.data?.total))
      }
    }
    catch (err) {
      console.log(err);
    }
  }
  useEffect(() => {
    if (!dashboardJobList?.length || !dashboardOverview || !dashboardPanel || !dashboardSummary) {
      handleGetDashboardSummary();
      handleGetDashboardList();
      handleGetDashboardOverview();
    }
  }, [dashboardJobList?.length, dashboardOverview?.length, dashboardPanel, dashboardSummary]);

  const statusKeys = useMemo(() => {
    if (!dashboardOverview || dashboardOverview.length === 0) return [];
    return Object.keys(dashboardOverview[0]).filter(
      (key) => key !== "month"
    );
  }, [dashboardOverview]);

  return (
    <>
      <Helmet>
        <title>Admin Dashboard | Job Portal</title>
      </Helmet>

      <div className="flex flex-col min-h-screen md:mt-[-40px] bg-gray-50/40 space-y-6 p-6">
        {/* Header Section */}
        <div className="flex flex-row  justify-end items-end sm:items-center gap-4">

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center bg-white border rounded-md px-3 py-1.5 shadow-sm text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Today, {new Date().toLocaleDateString()}</span>
            </div>
            <Button variant="default" className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4" /> Export Report
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardSummary?.totalJobs}</div>
              <p className="text-xs text-green-600 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                {dashboardSummary?.totalJobsCurrentMonth > 0 ? `+${dashboardSummary?.totalJobsCurrentMonth}` : 0} from this month
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Applications</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardSummary?.activeApplications}</div>
              <p className="text-xs text-green-600 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                {dashboardSummary?.activeApplicationsCurrentMonth > 0 ? `+${dashboardSummary?.activeApplicationsCurrentMonth}` : 0} from this month
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Interviews Scheduled</CardTitle>
              <Calendar className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardSummary?.interviewScheduled}</div>
              <p className="text-xs text-red-600 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1 rotate-180" />
                {dashboardSummary?.interviewScheduledCurrentMonth > 0 ? `+${dashboardSummary?.interviewScheduledCurrentMonth}` : 0} from this month
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Hired Candidates</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardSummary?.hiredCandidates}</div>
              <p className="text-xs text-green-600 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                {dashboardSummary?.hiredCandidatesCurrentMonth > 0 ? `+${dashboardSummary?.hiredCandidatesCurrentMonth}` : 0} from this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          <Card className="lg:col-span-4 shadow-sm">
            <CardHeader>
              <CardTitle>Applications Overview</CardTitle>
              <CardDescription>
                Monthly application trends for the current year.
              </CardDescription>
            </CardHeader>

            <CardContent className="pl-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dashboardOverview || []}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      opacity={0.1}
                    />

                    <XAxis
                      dataKey="month"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        boxShadow:
                          "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />

                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      layout="horizontal"
                      wrapperStyle={{
                        fontSize: isMobile ? "12px" : "14px",
                        paddingTop: "10px",
                        whiteSpace: isMobile ? "normal" : "nowrap",
                        display: "flex",
                        flexWrap: isMobile ? "wrap" : "nowrap",
                        justifyContent: "center",
                      }}
                      iconSize={10}
                    />
                    {statusKeys.map((key, index) => (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={statusColors[index % statusColors.length]}
                        fill={statusColors[index % statusColors.length]}
                        fillOpacity={0.2}
                        strokeWidth={2}
                        name={key.charAt(0).toUpperCase() + key.slice(1)}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Secondary Chart - Candidate Status Distribution */}
          <Card className="lg:col-span-3 shadow-sm">
            <CardHeader>
              <CardTitle>Recruitment Funnel</CardTitle>
              <CardDescription>
                Distribution of candidates across hiring stages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={candidateStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {candidateStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      itemStyle={{ color: "#374151" }}
                    />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      wrapperStyle={{ fontSize: "12px", lineHeight: "24px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section - Tables and Lists */}
        <div className="grid grid-cols-1 gap-6">

          {/* Recent Job Posts Table */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Job Postings</CardTitle>
                <CardDescription>A list of recently posted jobs.</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => { navigate("/jobs/jobs") }}>
                View All
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead>Applicants</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardJobList?.map((job) => (
                    <TableRow key={job._id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-lg">
                            <AvatarImage src={job.companyJobId?.logo} alt={job.companyJobId?.name} />
                            <AvatarFallback className="rounded-lg">{job?.companyJobId?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{job.jobTitle}</div>
                            <div className="text-xs text-muted-foreground">{job.company}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{job.locationType}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-gray-400" />
                          {job.applications?.length}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  );
};

export default AdminJobDashboard;
