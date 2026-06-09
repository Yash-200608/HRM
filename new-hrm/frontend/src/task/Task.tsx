import React, { useEffect, useRef, useState } from "react";
import { Plus, MoreHorizontal, Search, Filter, Eye, Edit, UserCheck, Trash2, ArrowLeft, CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import TaskForm from "./forms/TaskForm";
import SubTaskForm from "./forms/SubTaskForm";
import ReassignForm from "./forms/ReassignForm";
import TaskStatusChangeModal from "./cards/TaskStatusChangeModal";
import TaskDetailCard from "./cards/TaskDetailCard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getTask, taskStatusChange, reassignTask, deleteTask, getEmployees } from "@/services/Service";
import { formatDateTime, getStatusColor, getPriorityColor } from "@/services/allFunctions";
import DeleteCard from "@/components/cards/DeleteCard";
import SubTaskDetailCard from "./cards/SubTaskDetailCard";
import { useNotifications } from "@/contexts/NotificationContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getEmployeeList } from "@/redux-toolkit/slice/allPage/userSlice";
import { getTasks } from "@/redux-toolkit/slice/task/taskSlice";
import { socket } from "@/socket/socket";
import { EmployeeFormDialog } from "@/Forms/EmployeeFormDialog"
import { hasPermission } from "@/lib/permissions";

interface TaskItem {
  id: number;
  title: string;
  project: string;
  assignee: string;
  status: "pending" | "In Progress" | "completed" | "overdue" | "active";
  priority: "Low" | "Medium" | "High";
  dueDate: string;
}

const Task: React.FC = () => {
  const [tasks] = useState<TaskItem[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [reasignForm, setReasignForm] = useState(false);
  const [isTaskStatusChangeModalOpen, setIsTaskStatusChangeModalOpen] = useState(false);
  const [name, setName] = useState("Task");
  const [taskCard, setTaskCard] = useState(false);
  // const [taskList, setTaskList] = useState([]);
  const [taskListRefresh, setTaskListRefresh] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newStatus, setNewStatus] = useState(null);
  const [reassignName, setReassignName] = useState("Manager");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const { notifications, markAsRead, deleteNotification } = useNotifications();
  const [subTaskListRefresh, setSubTaskListRefresh] = useState(false);
  const [subTaskOpenForm, setSubTaskOpenForm] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [employeeListRefresh, setEmployeeListRefresh] = useState(false);
  const [taskId, setTaskId] = useState("");
  const dispatch = useAppDispatch();
  const taskList = useAppSelector((state) => state.task.tasks);
  const employeeList = useAppSelector((state) => state.user.employees);

  const navigate = useNavigate();
  const location = useLocation();
  const projectId = location?.state?.id;
  const projectName = location?.state?.name;

  const today = new Date();


  const canCreateTask = hasPermission(user, "tasks", "create");
const canEditTask = hasPermission(user, "tasks", "edit");
const canDeleteTask = hasPermission(user, "tasks", "delete");
const canViewTask = hasPermission(user, "tasks", "view");

const canCreateSubTask = hasPermission(user, "subtasks", "create");
const canEditSubTask = hasPermission(user, "subtasks", "edit");

const canReassignTask = hasPermission(user, "task_manager", "edit");

const canChangeTaskStatus = hasPermission(user, "tasks", "edit");

  const filteredTasks = taskList.filter((t) => {
    const matchesProject = projectId ? t.projectId?._id === projectId : true;
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = filterStatus === "all" || (filterStatus === "overdue"
      ? new Date(t.endDate) < today : t.status === filterStatus);

    return matchesProject && matchesSearch && matchesStatus;
  });

  useEffect(() => {
    socket.on("getEmployeeRefresh", () => {
      setEmployeeListRefresh(true);
    });
    socket.on("getTaskRefresh", () => {
      setTaskListRefresh(true);
    });
    socket.on("refreshTasks", () => {
      setTaskListRefresh(true);
    })

    return () => {
      socket.off("getEmployeeRefresh");
      socket.off("getTaskRefresh");
      socket.off("refreshTasks");
    };
  }, []);

  // =================== Fetch Employees ===================
  const handleGetEmployees = async () => {
    try {
      const data = await getEmployees(user?.companyId?._id || user?.createdBy?._id);
      if (Array.isArray(data)) {
        dispatch(getEmployeeList(data));
        setEmployeeListRefresh(false);
      };
    } catch (err: any) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (canEditTask && (employeeList.length === 0 || employeeListRefresh)) {
      handleGetEmployees();
    }
  }, [user?._id, employeeList.length, employeeListRefresh]);

  const handleOpenTaskForm = () => {
    if (!employeeList || employeeList.length === 0) {
      return toast({ title: "No Employees Found", description: "Please add at least one employee before creating a project.", variant: "destructive" });
    }

    setInitialData(null);
    setIsFormOpen(true);
  };

  const handleReassignTask = async (object) => {
    if (!user?._id || (!user?.companyId?._id && !user?.createdBy?._id)) return;

    let obj = { ...object, adminId: user?._id, companyId: user?.companyId?._id || user?.createdBy?._id }
    try {
      const res = await reassignTask(obj);
      if (res.status === 200) {
        socket.emit("addTaskRefresh");
        socket.emit("addSubTaskRefresh");
        socket.emit("refreshTasks");
        toast({ title: "Reassign Task", description: res.data.message });
        setReasignForm(false);
        setTaskListRefresh(true);
      }
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error", description: err.response.data.message, variant: "destructive" });
    }
  }


  const handleChangeStatus = async () => {
    if (!user?._id || (!user?.companyId?._id && !user?.createdBy?._id) || !selectedTask?._id || !newStatus) return;
    let obj = { adminId: user?._id, companyId: user?.companyId?._id || user?.createdBy?._id, taskId: selectedTask?._id, status: newStatus }
    try {
      const res = await taskStatusChange(obj);
      if (res.status === 200) {
        socket.emit("addTaskRefresh");
        socket.emit("addSubTaskRefresh");
        socket.emit("refreshTasks");
        toast({ title: "Task Status.", description: res.data.message });
        setTaskListRefresh(true);

      }
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error", description: err.response.data.message, variant: "destructive" })
    }
  }

  const handleGetTask = async () => {
    if (!user?._id || (!user?.companyId?._id && !user?.createdBy?._id)) { return }
    let obj = { companyId: user?.companyId?._id || user?.createdBy?._id, adminId: user?._id }
    try {
      const res = await getTask(obj);
      if (res.status === 200) {
        dispatch(getTasks(Array.isArray(res?.data?.data) ? res?.data?.data : Object.values(res?.data?.data)));
        setTaskListRefresh(false);
        setIsTaskStatusChangeModalOpen(false);
      }
    }
    catch (err) {
      console.log(err);
    }
  }
  const prevNotificationCount = useRef(0);

  useEffect(() => {
    if (!user?._id) return;

    const isTaskListEmpty = taskList?.length === 0;
    const isNewNotification =
      notifications?.length > prevNotificationCount.current;

    if (isTaskListEmpty || taskListRefresh || isNewNotification) {
      handleGetTask();
    }

    prevNotificationCount.current = notifications?.length || 0;

  }, [taskListRefresh, notifications, user?._id]);


  const handleConfirmDelete = async () => {
    if (!selectedTaskId || (!user?.companyId?._id && !user?.createdBy?._id) || !user?._id) return;
    let obj = { taskId: selectedTaskId, companyId: user?.companyId?._id || user?.createdBy?._id, adminId: user?._id }
    setIsDeleting(true);
    try {
      const res = await deleteTask(obj);
      if (res.status === 200) {
        setTaskListRefresh(true);
        socket.emit("addTaskRefresh");
        socket.emit("addSubTaskRefresh");
        socket.emit("refreshTasks");
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
console.log(filteredTasks.length)
console.log("TASK LIST", taskList);
console.log("PROJECT ID", projectId);

taskList.forEach((t) => {
  console.log("TASK PROJECT", t.projectId);
});
  return (
    <>
      <EmployeeFormDialog
        open={isDialogOpen}
        onClose={() => { setIsDialogOpen(false) }}
        isEditMode={false}
        initialData={null}
        setEmployeeListRefresh={setEmployeeListRefresh}
        selectedDepartmentId={""}
      />

      <SubTaskForm
        isOpen={subTaskOpenForm}
        setSubTaskListRefresh={setSubTaskListRefresh}
        onClose={() => setSubTaskOpenForm(false)}
        taskId={taskId}
        initialData={null} />

      <TaskForm
        projectId={null}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={initialData}
        setTaskListRefresh={setTaskListRefresh}
      />
      <DeleteCard
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        title="Confirm Task Deletion"
        message="Are you sure you want to permanently delete this task? All associated subtasks will also be deleted and cannot be recovered."
      />
      <ReassignForm
        isOpen={reasignForm}
        onClose={() => { setReasignForm(false) }}
        data={selectedTask}
        reassignName={reassignName}
        onSave={handleReassignTask}
      />
      <TaskStatusChangeModal name={name} task={selectedTask} isOpen={isTaskStatusChangeModalOpen} newStatus={newStatus} setNewStatus={setNewStatus} onConfirm={handleChangeStatus} onClose={() => setIsTaskStatusChangeModalOpen(false)} />
      {canViewTask ? (
  <TaskDetailCard
    isOpen={taskCard}
    taskId={selectedTaskId}
    onClose={() => setTaskCard(false)}
  />
) : (
  <SubTaskDetailCard
    isOpen={taskCard}
    subTaskId={selectedTaskId}
    onClose={() => setTaskCard(false)}
  />
)}


      <div className="flex flex-col md:mt-[-30px] min-h-screen bg-gray-50/50 p-3 sm:p-6 space-y-6 max-w-[100vw] sm:max-w-none">
        <Card>
          {/* <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">

          
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                {projectName && (
                  <h1 className="text-3xl font-bold text-gray-900 truncate">
                    Project: {projectName}
                  </h1>
                )}
                <h2 className={`text-xl font-semibold text-gray-700 truncate ${projectName ? "sm:ml-3" : ""
                  }`}>
                  Task List ({filteredTasks?.length})
                </h2>
              </div>

             
              {(user?.role === "admin" || user?.department?.managers?.includes(user?._id)) && (
                <>
                  <div className="flex flex-row jusitfy-end gap-2">
                    {(user?.role === "admin" && employeeList?.length === 0) && <Button
                      className="w-full sm:w-auto mt-2 sm:mt-0"
                      onClick={() => { setIsDialogOpen(true) }}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Employee
                    </Button>}
                    <Button
                      className="w-full sm:w-auto mt-2 sm:mt-0"
                      onClick={handleOpenTaskForm}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Create Task
                    </Button>
                  </div>
                </>
              )}
            </div>

          
            {projectName && (
              <p className="text-gray-500 text-sm mt-1">
                Manage tasks for this project, track progress, and deadlines.
              </p>
            )}
          </CardHeader> */}

          <CardHeader>
            <div className="flex items-center justify-between gap-2 w-full">

              {/* LEFT SIDE (always single row) */}
              <div className="flex items-center gap-2 min-w-0">

                {projectName && (
                  <h1 className="text-[14px] sm:text-3xl font-bold text-gray-900 truncate">
                    Project: {projectName}
                  </h1>
                )}

                <h2 className="text-[12px] sm:text-xl font-semibold text-gray-700 whitespace-nowrap">
                  Task List ({filteredTasks?.length})
                </h2>
              </div>
              

              {/* RIGHT SIDE BUTTONS (single row, compact) */}
              {(canCreateTask || canEditTask) && (
                  <div className="flex items-center gap-1 sm:gap-2">

                    {(user?.role === "admin" &&
                      employeeList?.length === 0) && (
                        <Button
                          className="px-2 py-1 text-[11px] md:w-[140px] sm:text-sm h-7 sm:h-9"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          <Plus className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                          Add
                        </Button>
                      )}

                    <Button
                      className="px-2 py-1 text-[11px] md:w-[140px] sm:text-sm h-7 sm:h-9"
                      onClick={handleOpenTaskForm}
                    >
                      <Plus className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                      Create Task
                    </Button>

                  </div>
                )}
            </div>

            {/* DESCRIPTION (only size adjust) */}
            {projectName && (
              <p className="text-gray-500 text-[11px] sm:text-sm mt-1">
                Manage tasks for this project, track progress, and deadlines.
              </p>
            )}
          </CardHeader>



          <CardContent>
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">All</SelectItem>
                  <SelectItem value="pending" className="cursor-pointer">Pending</SelectItem>
                  <SelectItem value="active" className="cursor-pointer">In Progress</SelectItem>
                  <SelectItem value="completed" className="cursor-pointer">Completed</SelectItem>
                  <SelectItem value="overdue" className="cursor-pointer">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-x-auto">
              <Table>

                <TableHeader>
                  <TableRow className="text-[11px] md:text-sm">
                    <TableHead className="px-1 md:px-4">Task</TableHead>
                    <TableHead className="hidden md:table-cell">
                     {canViewTask ? "Project" : "Parent Task"}
                    </TableHead>

                    {canViewTask  ? (
                      <TableHead className="hidden md:table-cell">Manager</TableHead>
                    ) : null}

                    <TableHead className="hidden md:table-cell">AssignedBy</TableHead>
                    <TableHead className="hidden md:table-cell">Priority</TableHead>

                    <TableHead className="px-1 md:px-4">Status</TableHead>
                    <TableHead className="px-1 md:px-4">Due</TableHead>
                    <TableHead className="text-right px-1 md:px-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredTasks.length ? (
                    filteredTasks.map((task) => (
                      <TableRow
                        key={task._id}
                        className="text-[11px] md:text-sm cursor-pointer"
                        onClick={() => {
                          if (canViewTask) {
                            navigate("/tasks/sub-task", {
                              state: {
                                id: task?._id,
                                projectName: task?.projectId?.name,
                                taskName: task?.name,
                              },
                            });
                          }
                        }}
                      >

                        {/* Task */}
                        <TableCell className="font-medium px-1 md:px-4 truncate max-w-[90px]">
                          {task.name}
                        </TableCell>

                        {/* Project */}
                        <TableCell className="hidden md:table-cell whitespace-nowrap">
                        {canViewTask
  ? task?.projectId?.name
  : task?.taskId?.name}
                        </TableCell>

                        {/* Manager */}
                        {canViewTask  ? (
                          <TableCell className="hidden md:table-cell">
                            {task.managerId?.fullName} (
                            {task?.managerId?.department?.name})
                          </TableCell>
                        ) : null}

                        {/* Assigned By */}
                        <TableCell className="hidden md:table-cell">
                          {task?.createdBy?.username || task?.createdBy?.fullName} (
                          {task?.createdByRole === "Employee" ? "Manager" : "Admin"})
                        </TableCell>

                        {/* Priority */}
                        <TableCell className="hidden md:table-cell">
                          <Badge className={`${getPriorityColor(task.priority)} whitespace-nowrap`}>
                            {task.priority}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="px-1 md:px-4">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status === "active"
                              ? "In_Progress"
                              : task.status.charAt(0).toUpperCase() +
                              task.status.slice(1)}
                          </Badge>
                        </TableCell>

                        {/* Due */}
                        <TableCell className="px-1 md:px-4 whitespace-nowrap">
                          {formatDateTime(task.endDate)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right px-1 md:px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 md:h-9 md:w-9"
                              >
                                <MoreHorizontal className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-44">
                              {canCreateSubTask && (
  <DropdownMenuItem
    className="flex items-center gap-2 cursor-pointer"
    onClick={(e) => {
      e.stopPropagation();
      setTaskId(task?._id);
      setSubTaskOpenForm(true);
    }}
  >
    <CheckSquare className="h-4 w-4 text-green-600" />
    Add Sub-Task
  </DropdownMenuItem>
)}

                              <DropdownMenuItem
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTaskId(task?._id);
                                  setTaskCard(true);
                                }}
                              >
                                <Eye className="h-4 w-4 text-green-600" />
                                View Task
                              </DropdownMenuItem>

                              {canEditTask  && (
                                  <>
                                    <DropdownMenuItem
                                      className="flex items-center gap-2 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setInitialData(task);
                                        setIsFormOpen(true);
                                      }}
                                    >
                                      <Edit className="h-4 w-4 text-green-600" />
                                      Edit Task
                                    </DropdownMenuItem>

                                    {canReassignTask  && (
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedTask(task);
                                          setReasignForm(true);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer"
                                      >
                                        <UserCheck className="h-4 w-4 text-blue-600" />
                                        Reassign
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}

                              {canChangeTaskStatus && (
  <DropdownMenuItem
    onClick={(e) => {
      e.stopPropagation();
      setSelectedTask(task);
      setIsTaskStatusChangeModalOpen(true);
    }}
    className="flex items-center gap-2 cursor-pointer"
  >
    <Filter className="h-4 w-4 text-purple-600" />
    Change Status
  </DropdownMenuItem>
)}

                              <DropdownMenuSeparator />

                              {canDeleteTask  && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTaskId(task?._id);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="flex items-center gap-2 text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
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
                      <TableCell colSpan={7} className="text-center h-24 text-sm">
                        No tasks found
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

export default Task;
