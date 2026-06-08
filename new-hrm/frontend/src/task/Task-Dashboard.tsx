import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutDashboard, Briefcase, CheckCircle2, Clock, AlertCircle, MoreHorizontal, FolderOpen, ArrowLeft } from "lucide-react";
import { getDashboardData } from "@/services/Service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getStatusColor, getPriorityColor, getTaskCountByStatus, getOverdueTasks } from "@/services/allFunctions";
import { Helmet } from "react-helmet-async";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getTaskDashboard } from "@/redux-toolkit/slice/task/dashboardSlice";
import { socket } from "@/socket/socket";

const TaskDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  // const [userData, setUserData] = useState(null);
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state?.taskDashboard?.taskDashboard);

  const handleGetData = async () => {
    try {
      if (!user?._id || (!user?.companyId?._id && !user?.createdBy?._id)) return;
      const res = await getDashboardData(user?._id, user?.companyId?._id || user?.createdBy?._id);
      if (res.status === 200) {
        dispatch(getTaskDashboard(res?.data?.summary));
      }
    }
    catch (err) {
      console.log(err);
    }
  }
  useEffect(() => {
    if (user?._id && (!userData || Object.keys(userData).length === 0)) {
      handleGetData();
    }
  }, [user?._id, userData]);


  useEffect(() => {
    socket.on("getProjectRefresh", () => {
      if (user?.role === "admin") {
        handleGetData();
      }
    });
    socket.on("getTaskRefresh", () => {
      handleGetData();
    });
    socket.on("getSubTaskRefresh", () => {
      handleGetData();
    });
    socket.on("refreshTasks", () => {
      handleGetData();
    })

    return () => {
      socket.off("getProjectRefresh");
      socket.off("getEmployeeRefresh");
      socket.off("getTaskRefresh");
      socket.off("getEmployeeRefresh");
      socket.off("getSubTaskRefresh");
      socket.off("refreshTasks");
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Task Page</title>
        <meta name="description" content="This is the home page of our app" />
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gray-50/50 p-6 space-y-8">
        {/* Summary Cards */}
        <div className={`grid grid-cols-1 md:mt-[-30px] gap-4 sm:grid-cols-2 ${user?.role === "admin" ? "lg:grid-cols-5" : "lg:grid-cols-4"
          }`}>
          {user?.role === "admin" ? <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userData?.totalProjects}</div>
              <p className="text-xs text-muted-foreground">last month</p>
            </CardContent>
          </Card> : ""}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userData?.totalTasks}</div>
              <p className="text-xs text-muted-foreground"> new tasks</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userData?.pendingTasks}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress Tasks</CardTitle>
              <FolderOpen className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userData?.activeTasks}</div>
              <p className="text-xs text-muted-foreground">Active workflows</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userData?.overdueTasks}</div>
              <p className="text-xs text-muted-foreground">Urgent action needed</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div
          className={`grid gap-8 ${(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
            }`}
        >
          {/* Projects Section */}
          <Card
            className={`col-span-1 shadow-sm border-gray-200 ${(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) ? "w-full" : ""
              }`}
          >
            <CardHeader
              className={`flex flex-row items-center justify-between ${(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) ? "px-8 py-6" : "px-4 py-3"
                }`}
            >
              <div>
                <CardTitle className={user?.taskRole === "none" ? "text-xl" : "text-lg"}>
                  Recent {user?.role === "admin" ? "Projects" : "Tasks"}
                </CardTitle>
                <CardDescription className={(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) ? "mt-1 text-base" : "mt-1 text-sm"}>
                  You have {userData?.length} active{" "}
                  {user?.role === "admin" ? "Projects" : "Tasks"}.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className={(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) ? "px-8 py-6" : "px-4 py-3"}>
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className={(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) ? "w-[200px] px-8 py-6" : "w-[150px] px-4 py-3"}>
                      Name
                    </TableHead>
                    <TableHead className={(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) ? "px-8 py-6 hidden md:table-cell" : "px-4 py-3 hidden md:table-cell"}>
                      Assigned By
                    </TableHead>
                    <TableHead className={(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) ? "px-8 py-6" : "px-4 py-3"}>
                      Status
                    </TableHead>
                    {(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) && (
                      <TableHead className="px-8 py-6">Start Date</TableHead>
                    )}
                    <TableHead className={(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) ? "text-right px-8 py-6" : "text-right px-4 py-3"}>
                      Due Date
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {userData?.recentProjects?.length > 0 ? (
                    userData.recentProjects.slice(0, 5).map((project) => (
                      <TableRow key={project._id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className={(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) ? "font-medium px-8 py-6" : "font-medium px-4 py-3"}>
                          {project.name}
                        </TableCell>

                        <TableCell className={(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) ? "px-8 py-6 hidden md:table-cell" : "px-4 py-3 hidden md:table-cell"}>
                          {project?.adminId?.username || project?.createdBy?.username || project?.createdBy?.fullName}
                        </TableCell>

                        <TableCell className={(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) ? "px-8 py-6" : "px-4 py-3"}>
                          <Badge className={getStatusColor(project.status)} variant="outline">
                            {project.status}
                          </Badge>
                        </TableCell>

                        {(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) && (
                          <TableCell className="px-8 py-6">
                            {formatDate(project.startDate)}
                          </TableCell>
                        )}

                        <TableCell className={(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) ? "text-right px-8 py-6" : "text-right px-4 py-3"}>
                          {formatDate(project.endDate)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={(user?.role !== "admin" && !user?.department?.managers?.includes(user?._id)) ? 5 : 4}
                        className="text-center py-10 text-muted-foreground font-medium"
                      >
                        Data Not Found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>

              </Table>
            </CardContent>
          </Card>



          {/* Tasks Section */}
          {(user?.role === "admin" || user?.department?.managers?.includes(user?._id)) ? <Card className="col-span-1 shadow-sm border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent {user?.role === "admin" ? "Tasks" : "Sub Tasks"}</CardTitle>
                <CardDescription>
                  Latest {user?.role === "admin" ? "Tasks" : "Sub Tasks"} assigned to the team.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-4">
                  {user?.role === "admin" || user?.department?.managers?.includes(user?._id) ? userData?.recentTasks?.map((task) =>
                    // project?.tasks?.map((task) => (
                    <div
                      key={task._id || task.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-card text-card-foreground shadow-sm hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="mt-1">
                          {task.status === "Completed" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : task.status === "Overdue" ? (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-primary/30" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold leading-none">
                            {task.title || task.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {task.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <Badge
                          variant="outline"
                          className={getStatusColor(task.status)}
                        >
                          {task.status === "active" ? "In_Progress" : task?.status}
                        </Badge>
                      </div>
                    </div>
                    // ))
                  ) : userData?.recentTasks?.length === 0 ? (
                    <div>Data Not Found.</div>
                  ) : null}
                </div>
              </ScrollArea>
            </CardContent>
          </Card> : ""}
        </div>
      </div>
    </>
  );
};

export default TaskDashboard;
