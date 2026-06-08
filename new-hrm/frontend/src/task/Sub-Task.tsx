import React, { useEffect, useState } from "react";
import { Plus, MoreHorizontal, Search, Filter, Eye, Edit, UserCheck, Trash2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SubTaskForm from "./forms/SubTaskForm";
import ReassignForm from "./forms/ReassignForm";
import TaskStatusChangeModal from "./cards/TaskStatusChangeModal";
import SubTaskDetailCard from "./cards/SubTaskDetailCard";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getSubTask, statusChangeSubTask, reassignSubTask, deleteSubTask, getEmployees } from "@/services/Service";
import { formatDateTime } from "@/services/allFunctions";
import DeleteCard from "@/components/cards/DeleteCard";
import { useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getEmployeeList } from "@/redux-toolkit/slice/allPage/userSlice";
import { getSubTasks } from "@/redux-toolkit/slice/task/subTaskSlice";
import { socket } from "@/socket/socket";


const SubTask: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [isTaskStatusChangeModalOpen, setIsTaskStatusChangeModalOpen] = useState(false);
  const [name, setName] = useState("Sub-Task");
  const [reasignForm, setReasignForm] = useState(false);
  const [isSubTaskDetailCardOpen, setIsSubTaskDetailCardOpen] = useState(false);
  const [selectedSubTask, setSelectedSubTask] = useState(null);
  const [reassignName, setReassignName] = useState("Employee");
  // const [subTaskList, setSubTaskList] = useState([]);
  const [subTaskListRefresh, setSubTaskListRefresh] = useState(false);
  const [newStatus, setNewStatus] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedSubTaskId, setSelectedSubTaskId] = useState(null);
  // const [employeeList, setEmployeeList] = useState<any[]>([]);
  const dispatch = useAppDispatch();
  const subTaskList = useAppSelector((state) => state.subTask.subTasks);
  const employeeList = useAppSelector((state) => state.user.employees);

  const location = useLocation();
  const taskId = location?.state?.id;
  const taskName = location?.state?.taskName;
  const projectName = location?.state?.projectName;
  const today = new Date();

  const filteredSubTasks = subTaskList.filter((t) => {
    const matchesTasks = taskId ? t.taskId?._id === taskId : true;
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = filterStatus === "all" || (filterStatus === "overdue"
      ? new Date(t.endDate) < today : t.status === filterStatus);

    return matchesTasks && matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80";
      case "active":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100/80";
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-100/80";
      case "overdue":
        return "bg-red-100 text-red-800 hover:bg-red-100/80";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100/80";
    }
  };

  useEffect(() => {
    socket.on("getEmployeeRefresh", () => {
      handleGetEmployees();
    });
    socket.on("getSubTaskRefresh", () => {
      setSubTaskListRefresh(true);
    });
    socket.on("refreshTasks", () => {
      setSubTaskListRefresh(true);
    })

    return () => {
      socket.off("getEmployeeRefresh");
      socket.off("getSubTaskRefresh");
      socket.off("refreshTasks");
    };
  }, []);

  // =================== Fetch Employees ===================
  const handleGetEmployees = async () => {
    try {
      const data = await getEmployees(user?.companyId?._id || user?.createdBy?._id);
      if (Array.isArray(data)) {
        dispatch(getEmployeeList(data));
      }
    } catch (err: any) {
      console.log(err);
    }
  };

  useEffect(() => {
    if ((user?.role === "admin" || user?.department?.managers?.includes(user?._id)) && employeeList.length === 0) {
      handleGetEmployees();
    }
  }, [user?._id, employeeList.length]);

  const handleOpenSubTaskForm = () => {
    if (!employeeList || employeeList.length === 0) {
      return toast({ title: "No Employees Found", description: "Please add at least one employee before creating a project.", variant: "destructive" });
    }

    const hasManager = employeeList.some((emp) => emp?.taskRole && emp.taskRole !== "none");
    if (!hasManager) {
      return toast({ title: "Manager Required", description: "Please assign at least one employee as a manager before creating a project.", variant: "destructive" });
    }
    setInitialData(null);
    setIsFormOpen(true);
  };


  const handleGetSubTask = async () => {
    if (!user?._id || (!user?.companyId?._id && !user?.createdBy?._id)) return;
    let obj = { companyId: user?.companyId?._id || user?.createdBy?._id, userId: user?._id }
    try {
      const res = await getSubTask(obj);
      if (res.status === 200) {
        dispatch(getSubTasks(res.data.data));
        setSubTaskListRefresh(false);
      }
    }
    catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    if (user?._id && (subTaskList?.length === 0 || subTaskListRefresh)) {
      handleGetSubTask()
    }
  }, [subTaskListRefresh, user?._id, subTaskList.length]);

  const handleChangeStatus = async () => {
    let obj = { userId: user?._id, companyId: user?.companyId?._id || user?.createdBy?._id, subTaskId: selectedSubTask?._id, status: newStatus }

    for (const [key, value] of Object.entries(obj)) {
      if (!value || (typeof value === "string" && value.trim() === "")) {
        toast({ title: "Error", description: `${key} is missing`, variant: "destructive" });
        return;
      }
    };
    try {
      const res = await statusChangeSubTask(obj);
      if (res.status === 200) {
        toast({ title: "Sub Task Status.", description: res.data.message });
        setSubTaskListRefresh(true);
        socket.emit("addTaskRefresh");
        socket.emit("addSubTaskRefresh");
        socket.emit("refreshTasks");
        setIsTaskStatusChangeModalOpen(false);
      }
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error", description: err.response.data.message, variant: "destructive" })
    }
  }

  const handleReassignTask = async (object) => {
    let obj = { ...object, adminId: user?._id, companyId: user?.companyId?._id || user?.createdBy?._id }
    try {
      const res = await reassignSubTask(obj);
      if (res.status === 200) {
        toast({ title: "Reassign Task Successfully.", description: res.data.message });
        setSubTaskListRefresh(true);
        socket.emit("addTaskRefresh");
        socket.emit("addSubTaskRefresh");
        socket.emit("refreshTasks");
        setReasignForm(false);
      }
      else {
        toast({ title: "Reassign Task Failed.", description: res.data.message });
      }
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error", description: err.response.data.message, variant: "destructive" });
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedSubTaskId || (!user?.companyId?._id && !user?.createdBy?._id) || !user?._id) return;
    let obj = { subtaskId: selectedSubTaskId, companyId: user?.companyId?._id || user?.createdBy?._id, adminId: user?._id }
    setIsDeleting(true);
    try {
      const res = await deleteSubTask(obj);
      if (res.status === 200) {
        socket.emit("addTaskRefresh");
        socket.emit("addSubTaskRefresh");
        socket.emit("refreshTasks");
        toast({
          title: "Sub Task Deleted.",
          description: `${res?.data?.message}`,
        });
        setSubTaskListRefresh(true);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };
  return (
    <>
      <SubTaskForm isOpen={isFormOpen} taskId={null} setSubTaskListRefresh={setSubTaskListRefresh} onClose={() => setIsFormOpen(false)} initialData={initialData} />
      <ReassignForm
        isOpen={reasignForm}
        onClose={() => { setReasignForm(false) }}
        data={selectedSubTask}
        reassignName={reassignName}
        onSave={handleReassignTask}
      />
      <DeleteCard
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        title="Confirm Subtask Deletion"
        message="Are you sure you want to permanently delete this subtask? Once deleted, it cannot be recovered."
      />
      <SubTaskDetailCard isOpen={isSubTaskDetailCardOpen} subTaskId={selectedSubTaskId} onClose={() => setIsSubTaskDetailCardOpen(false)} />
      <TaskStatusChangeModal name={name} task={selectedSubTask} isOpen={isTaskStatusChangeModalOpen} newStatus={newStatus} setNewStatus={setNewStatus} onConfirm={handleChangeStatus} onClose={() => setIsTaskStatusChangeModalOpen(false)} />
      <div className="flex flex-col md:mt-[-30px] min-h-screen bg-gray-50/50 p-6 space-y-6">
        <Card>
          {/* <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                {taskId && projectName && taskName ? (
                  <>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                      {projectName} &gt; {taskName}
                    </h1>
                    <h2 className="text-xl font-semibold text-gray-700 truncate">
                      Sub-Task List ({filteredSubTasks?.length})
                    </h2>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                      Sub-Task List
                    </h2>
                  </>
                )}
              </div>

              {(user?.role === "admin" || user?.department?.managers?.includes(user?._id)) && (
                <Button
                  className="w-full sm:w-auto mt-2 sm:mt-0"
                  onClick={handleOpenSubTaskForm}
                >
                  <Plus className="mr-2 h-4 w-4" /> Create Sub-Task
                </Button>
              )}
            </div>

            {taskId && projectName && taskName && (
              <p className="text-gray-500 text-sm mt-1">
                Manage tasks for this project, track progress, and deadlines.
              </p>
            )}
          </CardHeader> */}

          <CardHeader>
            <div className="flex items-center justify-between gap-2">

              {/* LEFT SIDE */}
              <div className="flex items-center gap-2 min-w-0">

                {taskId && projectName && taskName ? (
                  <>
                    <h1 className="text-[14px] sm:text-3xl font-bold text-gray-900 truncate">
                      {projectName} &gt; {taskName}
                    </h1>

                    <h2 className="text-[12px] sm:text-xl font-semibold text-gray-700 whitespace-nowrap">
                      Sub-Task List ({filteredSubTasks?.length})
                    </h2>
                  </>
                ) : (
                  <h2 className="text-[14px] sm:text-3xl font-bold text-gray-900 truncate">
                    Sub-Task List
                  </h2>
                )}

              </div>

              {/* RIGHT SIDE BUTTON */}
              {(user?.role === "admin" ||
                user?.department?.managers?.includes(user?._id)) && (
                  <Button
                    className="px-2 py-1 text-[11px] md:w-[160px] sm:text-sm h-7 sm:h-10 whitespace-nowrap"
                    onClick={handleOpenSubTaskForm}
                  >
                    <Plus className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                    Create Sub Task
                  </Button>
                )}

            </div>

            {/* DESCRIPTION */}
            {taskId && projectName && taskName && (
              <p className="text-gray-500 text-[11px] sm:text-sm mt-1">
                Manage tasks for this project, track progress, and deadlines.
              </p>
            )}
          </CardHeader>

          <CardContent>
            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sub-tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="w-full md:w-48">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending" className="cursor-pointer">Pending</SelectItem>
                    <SelectItem value="active" className="cursor-pointer">In Progress</SelectItem>
                    <SelectItem value="completed" className="cursor-pointer">Completed</SelectItem>
                    <SelectItem value="overdue" className="cursor-pointer">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-x-auto">
              <Table>

                <TableHeader>
                  <TableRow className="text-[11px] md:text-sm">
                    <TableHead className="px-1 md:px-4">Sub-Task Title</TableHead>
                    <TableHead className="hidden md:table-cell">Parent Task</TableHead>
                    <TableHead className="hidden md:table-cell">Employee</TableHead>
                    <TableHead className="hidden md:table-cell">AssignedBy</TableHead>
                    <TableHead className="px-1 md:px-4">Status</TableHead>
                    <TableHead className="px-1 md:px-4">Due Date</TableHead>
                    <TableHead className="text-right px-1 md:px-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredSubTasks.length > 0 ? (
                    filteredSubTasks.map((subTask) => (
                      <TableRow
                        key={subTask._id}
                        className="text-[11px] md:text-sm"
                      >

                        {/* Title */}
                        <TableCell className="font-medium px-1 md:px-4 truncate max-w-[100px]">
                          {subTask.name}
                        </TableCell>

                        {/* Parent Task */}
                        <TableCell className="hidden md:table-cell">
                          {subTask.taskId.name}
                        </TableCell>

                        {/* Employee */}
                        <TableCell className="hidden md:table-cell">
                          {subTask.employeeId?.fullName} (
                          {subTask?.employeeId?.department?.name})
                        </TableCell>

                        {/* Assigned By */}
                        <TableCell className="hidden md:table-cell">
                          {subTask?.createdBy?.username ||
                            subTask?.createdBy?.fullName} (
                          {subTask?.createdByRole === "Employee"
                            ? "Manager"
                            : "Admin"}
                          )
                        </TableCell>

                        {/* Status */}
                        <TableCell className="px-1 md:px-4">
                          <Badge
                            variant="outline"
                            className={`${getStatusColor(subTask.status)} text-[10px] md:text-sm px-1 py-0`}
                          >
                            {subTask.status === "active"
                              ? "In_Progress"
                              : subTask?.status.charAt(0).toUpperCase() +
                              subTask?.status?.slice(1)}
                          </Badge>
                        </TableCell>

                        {/* Due Date */}
                        <TableCell className="px-1 md:px-4 whitespace-nowrap text-[10px] md:text-sm">
                          {formatDateTime(subTask.endDate)}
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

                            <DropdownMenuContent align="end" className="w-44">

                              <DropdownMenuItem
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubTaskId(subTask?._id);
                                  setIsSubTaskDetailCardOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 text-green-600" />
                                View
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInitialData(subTask);
                                  setIsFormOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 text-green-600" />
                                Edit
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubTask(subTask);
                                  setReasignForm(true);
                                }}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <UserCheck className="h-4 w-4 text-blue-600" />
                                Reassign
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubTask(subTask);
                                  setIsTaskStatusChangeModalOpen(true);
                                }}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Filter className="h-4 w-4 text-purple-600" />
                                Change Status
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubTaskId(subTask?._id);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="flex items-center gap-2 text-red-600 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>

                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>

                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-20 text-center text-sm">
                        No Sub Task Found.
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

export default SubTask;
