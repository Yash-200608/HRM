import React, { useState, useEffect } from "react";
import { MoreHorizontal, Search, Filter, AlertCircle, Eye, Edit, UserPlus, CheckCircle, ArrowLeft, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReassignForm from "./forms/ReassignForm";
import TaskStatusChangeModal from "./cards/TaskStatusChangeModal";
import TaskForm from "./forms/TaskForm";
import TaskDetailCard from "./cards/TaskDetailCard";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getOverdueTask, getProject, taskStatusChange, reassignTask, deleteTask } from "@/services/Service";
import { formatDateTime, getStatusColor, getPriorityColor } from "@/services/allFunctions";
import DeleteCard from "@/components/cards/DeleteCard";
import SubTaskDetailCard from "./cards/SubTaskDetailCard";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getOverdueTasks } from "@/redux-toolkit/slice/task/overdueTaskSlice";
import { getProjects } from "@/redux-toolkit/slice/task/projectSlice";
import { socket } from "@/socket/socket";

const OverdueTask: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [isTaskStatusChangeModalOpen, setIsTaskStatusChangeModalOpen] = useState(false);
  const [name, setName] = useState("Overdue-Task");
  const [reasignForm, setReasignForm] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [taskCard, setTaskCard] = useState(false);
  const [taskListRefresh, setTaskListRefresh] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [reassignName, setReassignName] = useState("Manager");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [newStatus, setNewStatus] = useState(null);
  const dispatch = useAppDispatch();
  const tasks = useAppSelector((state) => state.overdueTask.overdueTasks);
  const projects = useAppSelector((state) => state.project.projects);
  const filteredTasks = tasks.filter(
    (t) =>
      t?.name?.toLowerCase().includes(search.toLowerCase()) &&
      (filterStatus === "all" || t.status === filterStatus) &&
      (filterProject === "all" || t.projectId?._id === filterProject)
  );

  useEffect(() => {
    socket.on("getProjectRefresh", () => {
      if (user?.role === "admin") {
        handleGetProject();
      }
    });
    socket.on("getTaskRefresh", () => {
      setTaskListRefresh(true);
    });
    socket.on("getSubTaskRefresh", () => {
      setTaskListRefresh(true);
    });
    socket.on("refreshTasks", () => {
      setTaskListRefresh(true);
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

  const handleReassignTask = async (object) => {
    if (!object || !user?._id || !user?.companyId?._id) return;
    let obj = { ...object, adminId: user?._id, companyId: user?.companyId?._id }
    try {
      const res = await reassignTask(obj);
      if (res.status === 200) {
        toast({ title: "Reassign Task", description: res.data.message });
        socket.emit("addTaskRefresh");
        socket.emit("addSubTaskRefresh");
        setTaskListRefresh(true);
        setReasignForm(false);
      }
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error", description: err.response.data.message, variant: "destructive" });
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedTaskId || !user?.companyId?._id || !user?._id) return;
    let obj = { taskId: selectedTaskId, companyId: user?.companyId?._id || user?.createdBy?._id, adminId: user?._id }
    setIsDeleting(true);
    try {
      const res = await deleteTask(obj);
      if (res.status === 200) {
        setTaskListRefresh(true);
        socket.emit("addTaskRefresh");
        socket.emit("addSubTaskRefresh");
        toast({
          title: "Task Deleted.",
          description: `${res?.data?.message}`,
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Something went wrong",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!user?._id || (!user?.companyId?._id && !user?.createdBy?._id) || !selectedTask?._id || !newStatus) return;
    let obj = { adminId: user?._id, companyId: user?.companyId?._id || user?.createdBy?._id, taskId: selectedTask?._id, status: newStatus }
    try {
      const res = await taskStatusChange(obj);
      if (res.status === 200) {
        toast({ title: "Task Status.", description: res.data.message });
        socket.emit("addTaskRefresh");
        socket.emit("addSubTaskRefresh");
        setTaskListRefresh(true);
        setIsTaskStatusChangeModalOpen(false);

      }
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error", description: err.response.data.message, variant: "destructive" })
    }
  }

  const handleGetOverdueTask = async () => {
    if (!user?._id || (!user?.companyId?._id && !user?.createdBy?._id)) return;
    try {
      const res = await getOverdueTask(user?._id, user?.companyId?._id || user?.createdBy?._id);
      if (res.status === 200) {
        dispatch(getOverdueTasks(res?.data?.data || []));
        setTaskListRefresh(false);
      }
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error", description: err.response.data.message, variant: "destructive" });
    }
  }

  const handleGetProject = async () => {
    if (user?._id || !user?.companyId?._id)
      try {
        const res = await getProject(user?._id, user?.companyId?._id);
        if (res.status === 200) {
          dispatch(getProjects(res?.data || []));
        }
      }
      catch (err) {
        console.log(err);
      }
  }

  useEffect(() => {
    if (user?._id && (tasks?.length === 0 || taskListRefresh)) {
      handleGetOverdueTask();
    }
  }, [user?._id, taskListRefresh, tasks?.length]);

  useEffect(() => {
    if (user?.role === "admin" && (projects?.length === 0)) {
      handleGetProject();
    }
  }, [user?._id, projects?.length]);

  return (
    <>
      <TaskForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={initialData}
        setTaskListRefresh={setTaskListRefresh}
        projectId=""
      />
      <ReassignForm
        isOpen={reasignForm}
        onClose={() => { setReasignForm(false) }}
        data={selectedTask}
        reassignName={reassignName}
        onSave={handleReassignTask}
      />
      <DeleteCard
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        title="Confirm Overdue Task Deletion"
        message="Are you sure you want to permanently delete this task? All associated subtasks will also be deleted and cannot be recovered."
      />
      <TaskStatusChangeModal name={name} task={selectedTask} isOpen={isTaskStatusChangeModalOpen} newStatus={newStatus} setNewStatus={setNewStatus} onConfirm={handleChangeStatus} onClose={() => setIsTaskStatusChangeModalOpen(false)} />
      {(user?.role === "admin" || user?.department?.managers?.includes(user?._id)) ? (
        <TaskDetailCard isOpen={taskCard} taskId={selectedTaskId} onClose={() => setTaskCard(false)} />
      ) : !user?.department?.managers?.includes(user?._id) ? (
        <SubTaskDetailCard isOpen={taskCard} subTaskId={selectedTaskId} onClose={() => setTaskCard(false)} />
      ) : null}

      <div className="flex flex-col min-h-screen bg-gray-50/50 p-6 space-y-6 md:mt-[-26px]">
        <Card className="border-red-100 shadow-sm">
          <CardHeader>

            <CardTitle className="text-[16px] sm:text-xl font-semibold">
              Overdue Items ({filteredTasks?.length})
            </CardTitle>

            <CardDescription className="text-[11px] sm:text-sm mt-1">
              Prioritize these tasks to get back on track.
            </CardDescription>

          </CardHeader>
          <CardContent>
            {/* Search and Filter */}

            <div className="flex flex-col md:flex-row gap-4 mb-6">

              {/* Search Input (NO CHANGE as requested) */}
              <div
                className={`relative ${user?.role === "admin" ? "flex-1" : "w-full"
                  }`}
              >
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search overdue tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`pl-8 ${user?.role !== "admin" ? "w-full" : ""}`}
                />
              </div>

              {/* Filters Row (ONLY MOBILE FIX HERE) */}
              <div className="flex flex-row gap-2 w-full md:w-auto">

                {/* Status Filter */}
                <div className="flex-1 md:w-48">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="text-[12px] md:text-sm">
                      <Filter className="w-4 h-4 mr-1 text-muted-foreground" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">In Progress</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Project Filter (Admin only) */}
                {user?.role === "admin" && (
                  <div className="flex-1 md:w-48">
                    <Select value={filterProject} onValueChange={setFilterProject}>
                      <SelectTrigger className="text-[12px] md:text-sm">
                        <Filter className="w-4 h-4 mr-1 text-muted-foreground" />
                        <SelectValue placeholder="Project" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {projects?.map((proj) => (
                          <SelectItem key={proj?._id} value={proj?._id}>
                            {proj?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              </div>

            </div>

            {/* Table */}
            <div className="rounded-md border overflow-x-auto">
              <Table>

                <TableHeader>
                  <TableRow className="text-[11px] md:text-sm">
                    <TableHead className="px-1 md:px-4">Task Title</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {!user?.department?.managers?.includes(user?._id)
                        ? "Parent Task"
                        : "Project"}
                    </TableHead>
                    <TableHead className="hidden md:table-cell">AssignedBy</TableHead>
                    <TableHead className="px-1 md:px-4">Due Date</TableHead>
                    <TableHead className="px-1 md:px-4">Status</TableHead>
                    <TableHead className="text-right px-1 md:px-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                      <TableRow
                        key={task?._id}
                        className="text-[11px] md:text-sm"
                      >

                        {/* Task Title */}
                        <TableCell className="font-medium px-1 md:px-4 truncate max-w-[90px]">
                          {task.name}
                        </TableCell>

                        {/* Parent Task / Project */}
                        <TableCell className="hidden md:table-cell">
                          {task?.projectId?.name || task?.taskId?.name}
                        </TableCell>

                        {/* Assigned By */}
                        <TableCell className="hidden md:table-cell">
                          {task?.createdBy?.role === "admin"
                            ? "Admin"
                            : task?.createdBy?.fullName ||
                            task?.managerId?.fullName}
                        </TableCell>

                        {/* Due Date */}
                        <TableCell className="px-1 md:px-4 text-red-600 font-medium whitespace-nowrap text-[10px] md:text-sm">
                          {formatDateTime(task?.endDate)}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="px-1 md:px-4">
                          <Badge
                            variant="outline"
                            className={`${getStatusColor(task?.status)} text-[10px] md:text-sm px-1 py-0`}
                          >
                            {task.status === "active" ? "In_Progress" : task.status}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right px-1 md:px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-7 w-7 md:h-8 md:w-8 p-0"
                              >
                                <MoreHorizontal className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTaskId(task?._id);
                                  setTaskCard(true);
                                }}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </DropdownMenuItem>

                              {(user?.role === "admin" ||
                                user?.department?.managers?.includes(user?._id)) && (
                                  <>
                                    <DropdownMenuItem
                                      className="flex items-center gap-2 cursor-pointer"
                                      onClick={() => {
                                        setInitialData(task);
                                        setIsFormOpen(true);
                                      }}
                                    >
                                      <Edit className="w-4 h-4" />
                                      Edit Task
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      className="flex items-center gap-2 cursor-pointer"
                                      onClick={() => {
                                        setSelectedTask(task);
                                        setReasignForm(true);
                                      }}
                                    >
                                      <UserPlus className="w-4 h-4" />
                                      Reassign
                                    </DropdownMenuItem>
                                  </>
                                )}

                              <DropdownMenuItem
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setIsTaskStatusChangeModalOpen(true);
                                }}
                              >
                                <CheckCircle className="w-4 h-4" />
                                Change Status
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {(user?.role === "admin" ||
                                user?.department?.managers?.includes(user?._id)) && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTaskId(task?._id);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="flex items-center gap-2 text-red-600 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Task
                                  </DropdownMenuItem>
                                )}

                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>

                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-20 text-center text-sm">
                        No overdue tasks found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>

              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default OverdueTask;
