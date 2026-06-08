

import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronDown } from "lucide-react";
import { Priority, SubTaskFormModalProps, SubTaskFormData } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getTask, getEmployeebyDepartment, addSubTask, updateSubTask } from "@/services/Service";
import { formatForDateTimeInput } from "@/services/allFunctions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import TaskForm from "./TaskForm";
import { EmployeeFormDialog } from "@/Forms/EmployeeFormDialog";
import { socket } from "@/socket/socket";

const SubTaskForm: React.FC<SubTaskFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
  setSubTaskListRefresh,
  taskId
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [taskForm, setTaskForm] = useState<SubTaskFormData>({});
  const [loading, setLoading] = useState(false);
  const [taskList, setTaskList] = useState<any[]>([]);
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [startDateTouched, setStartDateTouched] = useState(false);
  const [localIsEdit, setLocalIsEdit] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskListRefresh, setTaskListRefresh] = useState(false);
  const [taskDates, setTaskDates] = useState<{ startDate?: string; endDate?: string }>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [employeeListRefresh, setEmployeeListRefresh] = useState(false);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollArrow, setShowScrollArrow] = useState(false);

  const isEdit = Boolean(initialData);
  const today = new Date().toISOString().split("T")[0];

  // Scroll detection
  const checkScrollable = () => {
    if (!scrollRef.current) return;
    const { scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollArrow(scrollHeight > clientHeight + 5);
  };

  useEffect(() => {
    socket.on("getTaskRefresh", () => {
      setTaskListRefresh(true);
      handleGetTask();
    });

    return () => {
      socket.off("getTaskRefresh");
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    checkScrollable();
    const timer = setTimeout(checkScrollable, 400);
    const ro = new ResizeObserver(checkScrollable);
    if (scrollRef.current) ro.observe(scrollRef.current);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [isOpen, taskForm, employeeList, taskList, isFormOpen]);

  useEffect(() => {
    if (taskId) {
      setTaskForm(prev => ({ ...prev, taskId }));
    }
  }, [taskId]);

  useEffect(() => {
    const initializeForm = async () => {
      if (!isOpen) return;

      if (initialData?._id || taskId) {
        setLocalIsEdit(true);
        const selectedTaskId = taskId || initialData?.taskId?._id || initialData?.taskId;
        if (!user?._id || (!user?.companyId?._id && !user?.createdBy?._id)) return;

        let selectedTask = taskList.find(t => t._id === selectedTaskId);

        if (!selectedTask && selectedTaskId) {
          const freshTasks = await handleGetTask();
          selectedTask = freshTasks.find(t => t._id === selectedTaskId);
        }

        if (selectedTask) {
          setTaskDates({
            startDate: formatForDateTimeInput(selectedTask?.startDate),
            endDate: formatForDateTimeInput(selectedTask?.endDate),
          });
          const obj = {
            taskId: selectedTask._id,
            department: selectedTask.managerId?.department?._id,
            companyId: user?.companyId?._id || user?.createdBy?._id,
            adminId: user._id
          };
          try {
            const res = await getEmployeebyDepartment(obj);
            if (res.status === 200) {
              setEmployeeList(res.data.data || []);
              setTaskForm({
                _id: initialData?._id,
                taskId: selectedTaskId,
                name: initialData?.name,
                description: initialData?.description,
                startDate: formatForDateTimeInput(initialData?.startDate),
                endDate: formatForDateTimeInput(initialData?.endDate),
                employee: initialData?.employeeId?._id || initialData?.employeeId || "",
                priority: initialData?.priority,
                remarks: initialData?.remarks
              });

            }
          } catch (err) {
            console.error("Error fetching employees:", err);
          }
        }
      } else {
        setLocalIsEdit(false);
        setTaskForm({ taskId });
        setEmployeeList([]);
      }
    };

    initializeForm();
  }, [isOpen, initialData, taskId, taskList, employeeListRefresh]);

  const handleParentTaskChange = async (selectedTaskId: string) => {
    if (isEdit || initialData?._id) return; // don't allow change in edit mode

    const selectedTask = taskList.find(t => t._id === selectedTaskId);
    if (!selectedTask) return;

    const obj = {
      taskId: selectedTask._id,
      department:  selectedTask.managerId?.department?._id,
      companyId: user?.companyId?._id || user?.createdBy?._id,
      adminId: user._id
    };

    try {
      
      const res = await getEmployeebyDepartment(obj);
      if (res.status === 200) {
        socket.emit("refreshTasks");
        setEmployeeList(res.data.data || []);
        setTaskForm(prev => ({ ...prev, taskId: selectedTaskId, employee: "" }));
        setTaskDates({
          startDate: formatForDateTimeInput(selectedTask?.startDate),
          endDate: formatForDateTimeInput(selectedTask?.endDate),
        });

      }
    } catch (err: any) {
      toast({ title: "Error Selct Task.", description: err.response?.data?.message, variant: "destructive" });
    }
  };


  const handleSave = async (e?: React.FormEvent, forceCreate = false) => {
    e?.preventDefault();

    const payload = {
      _id: initialData?._id,
      companyId: user?.companyId?._id || user?.createdBy?._id,
      taskId: taskForm?.taskId,
      createdBy: user?._id,
      createdByRole: user?.role === "admin" ? "Admin" : "Employee",
      employeeId: taskForm?.employee,
      name: taskForm?.name,
      description: taskForm?.description,
      remarks: taskForm?.remarks,
      startDate: taskForm?.startDate,
      endDate: taskForm?.endDate,
      priority: taskForm?.priority,
      forceCreate,
    };

    setLoading(true);

    try {
      const res = isEdit
        ? await updateSubTask(payload)
        : await addSubTask(payload);

      if (res.data?.warning) {
        setPendingPayload(payload);
        setConfirmOpen(true);
        return;
      }

      if (res.status === 200 || res.status === 201) {
        setSubTaskListRefresh(true);
        socket.emit("refreshTasks");
        toast({
          title: isEdit ? "Update Sub Task Successfully" : "Add Sub Task Successfully",
          description: res.data.message,
        });
        onClose();
      } else {
        toast({
          title: isEdit ? "Update Failed" : "Add Failed",
          description: res.data.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to save",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleGetTask = async () => {
    if (!user?._id || (!user?.companyId?._id && !user?.createdBy?._id)) return [];

    const obj = { companyId: user?.companyId?._id || user?.createdBy?._id, adminId: user._id };

    try {
      const res = await getTask(obj);
      if (res.status === 200) {
        const data = res?.data?.data;
        const formatted = Array.isArray(data) ? data : Object.values(data || {});
        setTaskList(formatted);
        setTaskListRefresh(false);
        return formatted;
      }
    } catch (err) {
      console.log(err);
    }

    return [];
  };

  useEffect(() => {
    if (!isOpen) return;
    if (!taskList.length || taskListRefresh) {
      handleGetTask();
    }
  }, [isOpen, taskListRefresh]);


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

      <TaskForm
        projectId={null}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={null}
        setTaskListRefresh={setTaskListRefresh}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Employee already has active tasks</AlertDialogTitle>
            <AlertDialogDescription>
              Do you still want to assign this sub-task?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                handleSave(undefined, true);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[580px] w-[92vw] max-h-[94vh] p-0 gap-0 rounded-lg overflow-hidden">
          <form onSubmit={handleSave} className="flex flex-col h-full">
            <DialogHeader className="px-5 pt-2 pb-1 border-b shrink-0">
              <DialogTitle className="text-lg font-semibold">
                {isEdit ? "Edit Sub-Task" : "Create New Sub-Task"}
              </DialogTitle>
            </DialogHeader>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 py-1 space-y-4 text-sm"
            >
              {/* Parent Task & Sub-Task Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="parentTask" className="text-sm font-medium">Parent Task</Label>
                  <Select
                    value={taskForm?.taskId?.toString() || ""}
                    onValueChange={handleParentTaskChange}
                    disabled={taskList.length === 0}
                  >
                    <SelectTrigger id="parentTask" className="h-9 text-sm">
                      <SelectValue placeholder="Select Parent Task" />
                    </SelectTrigger>
                    <SelectContent className="max-h-52">
                      {taskList.map((t) => (
                        <SelectItem key={t._id} value={t._id}>
                          {t.name}
                        </SelectItem>
                      ))}
                      <div className="border-t my-1" />
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(true)}
                        className="w-full text-left px-2 py-1.5 text-sm text-primary hover:bg-muted rounded-sm"
                      >
                        + Add New Parent Task
                      </button>
                    </SelectContent>
                  </Select>

                  {taskList.length === 0 && (
                    <div className="flex items-center justify-between text-xs text-red-500 mt-1">
                      <span>Please add a parent task first</span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsFormOpen(true)}
                        className="h-7 px-3 text-xs"
                      >
                        + Add Task
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="taskName" className="text-sm font-medium">Sub Task Name</Label>
                  <Input
                    id="taskName"
                    placeholder="Enter sub-task name"
                    value={taskForm?.name || ""}
                    onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                    className="h-9 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="grid gap-1.5">
                <Label htmlFor="description" className="text-sm font-medium md:mt[-15px]">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Briefly describe the sub-task (Optional)"
                  value={taskForm?.description || ""}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="min-h-[72px] text-sm resize-y"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="startDate" className="text-sm font-medium">Start Date</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    ref={startDateRef}
                    onClick={() => { if (startDateRef.current?.showPicker) { startDateRef.current.showPicker() } }}
                    min={taskDates?.startDate}
                    max={taskDates?.endDate}
                    value={taskForm?.startDate || ""}
                    onChange={(e) => {
                      setStartDateTouched(true);
                      setTaskForm(prev => ({
                        ...prev,
                        startDate: e.target.value,
                        endDate:
                          prev.endDate && e.target.value && prev.endDate < e.target.value
                            ? ""
                            : prev.endDate
                      }));
                    }}
                    className="h-9 text-sm"
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="endDate" className="text-sm font-medium">End Date</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    ref={endDateRef}
                    onClick={() => { if (endDateRef.current?.showPicker) { endDateRef.current.showPicker() } }}
                    min={taskForm?.startDate || taskDates?.startDate}
                    max={taskDates?.endDate}
                    disabled={!taskForm?.startDate}
                    value={taskForm?.endDate || ""}
                    onChange={(e) => setTaskForm({ ...taskForm, endDate: e.target.value })}
                    required
                    className="h-9 text-sm"
                  />
                  {!taskForm?.startDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Select start date first
                    </p>
                  )}
                </div>
              </div>

              {/* Employee & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="grid gap-1.5">
                  <Label htmlFor="employee" className="text-sm font-medium">
                    Employee
                  </Label>

                  <Select
                    disabled={!taskForm?.taskId}
                    value={taskForm?.employee || ""}
                    onValueChange={(value) =>
                      setTaskForm({ ...taskForm, employee: value })
                    }
                    required
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>

                    <SelectContent>
                      {employeeList.length > 0 ? (
                        <>
                          {employeeList.map((emp) => (
                            <SelectItem
                              key={emp._id}
                              value={emp._id}
                              disabled={emp?.department?.managers?.includes(emp?._id)}
                            >
                              {emp.fullName} ({emp.department?.name})
                              {emp?.department?.managers?.includes(emp?._id) ? " • Manager" : ""}
                            </SelectItem>
                          ))}

                          {/* Add More button inside dropdown */}
                          {user?.role === "admin" && <div className="px-2 py-1">
                            <button
                              type="button"
                              className="w-full text-xs text-center text-blue-600 hover:underline"
                              onClick={() => {
                                setIsDialogOpen(true);
                              }}
                            >
                              + Add More Employee
                            </button>
                          </div>}
                        </>
                      ) : (
                        taskForm?.taskId && (
                          <div className="px-2 py-2 text-xs text-muted-foreground">
                            No employees found for this task
                          </div>
                        )
                      )}
                    </SelectContent>
                  </Select>

                  {/* Show message + Add button only if task selected AND no employees */}
                  {taskForm?.taskId && employeeList.length === 0 && (
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">
                        No employees available for selected task
                      </p>
                      {user?.role === "admin" && <button
                        type="button"
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => {
                          setIsDialogOpen(true);
                        }}
                      >
                        + Add Employee
                      </button>}
                    </div>
                  )}

                  {!taskForm?.taskId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Select parent task first
                    </p>
                  )}
                </div>


                <div className="grid gap-1.5">
                  <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
                  <Select
                    value={taskForm?.priority || ""}
                    onValueChange={(value) => setTaskForm({ ...taskForm, priority: value as Priority })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Remarks */}
              <div className="grid gap-1.5">
                <Label htmlFor="remarks" className="text-sm font-medium">Remarks</Label>
                <Textarea
                  id="remarks"
                  placeholder="Add any additional notes or remarks (Optional)"
                  value={taskForm?.remarks || ""}
                  onChange={(e) => setTaskForm({ ...taskForm, remarks: e.target.value })}
                  className="min-h-[70px] text-sm resize-y"
                />
              </div>
            </div>

            {/* Footer + scroll indicator */}
            <div className="relative shrink-0 border-t bg-background">
              <DialogFooter className="px-5 py-4 gap-3 flex-col-reverse sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="h-9 text-sm w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !taskForm?.name ||
                    !taskForm?.startDate ||
                    !taskForm?.endDate ||
                    !taskForm?.employee ||
                    !taskForm?.priority ||
                    !taskForm?.taskId
                  }
                  className="h-9 text-sm w-full sm:w-auto"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEdit ? "Update Sub-Task" : "Create Sub-Task"}
                </Button>
              </DialogFooter>

              {showScrollArrow && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none">
                  <div className="flex flex-col items-center text-muted-foreground animate-bounce">
                    <ChevronDown className="h-6 w-6 opacity-70" />
                    <span className="text-xs opacity-60 mt-0.5">scroll for more</span>
                  </div>
                </div>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubTaskForm;
