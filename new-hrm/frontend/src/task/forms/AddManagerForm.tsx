
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { getDepartments, getEmployees, addTaskManager, updateTaskManager} from "@/services/Service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import { socket } from "@/socket/socket";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getEmployeeList } from "@/redux-toolkit/slice/allPage/userSlice";
import { getDepartment } from "@/redux-toolkit/slice/allPage/departmentSlice";

const AddManagerForm = ({ isOpen, onIsOpenChange, initialData, setManagerRefresh, managerData}) => {

    const [department, setDepartment] = useState("none");
    const [loading, setLoading] = useState(false);

    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [existingManagers, setExistingManagers] = useState([]);

    const dispatch = useAppDispatch();
    const employeeList = useAppSelector((state) => state?.user?.employees);
    const departmentList = useAppSelector((state) => state?.department?.departments);

    const { toast } = useToast();
    const { user } = useAuth();

    const resetForm = () => {
        setDepartment("none");
        setFilteredEmployees([]);
        setSelectedEmployees([]);
        setExistingManagers([]);
    };

    useEffect(() => {
        if (!isOpen) return;

        const data = managerData || initialData;

        if (data) {

            const deptId =
                data.department?._id ||
                data.departmentId ||
                "none";

            setDepartment(deptId);

            const dept = departmentList.find(d => d._id === deptId);
            const managerIds = dept?.managers || [];

            setExistingManagers(managerIds);
            setSelectedEmployees(managerIds);

            const filtered = employeeList.filter(
                (emp) => emp.department?._id === deptId
            );

            setFilteredEmployees(filtered);

        } else {
            resetForm();
        }

    }, [initialData, managerData, isOpen, employeeList, departmentList]);

    useEffect(() => {
        socket.on("getEmployeeRefresh", () => {
            handleGetEmployees();
        });

        return () => {
            socket.off("getEmployeeRefresh");
        };
    }, []);

    const handleGetDepartments = async () => {
        try {
            const data = await getDepartments(user?.companyId?._id);
            dispatch(getDepartment(data));
        } catch (err) {
            console.log(err);
        }
    };

    const handleGetEmployees = async () => {
        try {
            const data = await getEmployees(user?.companyId?._id);
            dispatch(getEmployeeList(data));
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        if ((departmentList?.length === 0 || isOpen) && user?.role === "admin") {
            handleGetDepartments();
        }
    }, [isOpen]);

    useEffect(() => {
        if ((employeeList?.length === 0 || isOpen) && user?.role === "admin") {
            handleGetEmployees();
        }
    }, [isOpen]);

    const handleDepartmentChange = (value) => {
        setDepartment(value);

        if (value === "none") {
            setFilteredEmployees([]);
            setSelectedEmployees([]);
            setExistingManagers([]);
            return;
        }

        const filtered = employeeList.filter(
            (emp) => emp.department?._id === value
        );

        setFilteredEmployees(filtered);

        const dept = departmentList.find(d => d._id === value);
        const managerIds = dept?.managers || [];

        setSelectedEmployees(managerIds);
        setExistingManagers(managerIds);
    };

    const toggleEmployee = (id) => {
        setSelectedEmployees((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : [...prev, id]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!department || department === "none") return;
        if (selectedEmployees.length === 0) return;

        const payload = { department, employeeIds: selectedEmployees};

              setLoading(true);
        try {
            let res;

            if (!initialData) {
                res = await addTaskManager( user?._id, user?.companyId?._id, payload);
            } else {
                res = await updateTaskManager( user?._id, user?.companyId?._id, payload);
            }

            if (res.status === 200 || res.status === 201) {
                toast({
                    title: initialData ? "Updated" : "Added",
                    description: res.data.message
                });

                onIsOpenChange(false);
                setManagerRefresh?.(true);

                socket.emit("addEmployeeRefresh");
                socket.emit("departmentRefresh", department);
            }

        } catch (err) {
            toast({
                title: "Error",
                description: err?.response?.data?.message || "Something went wrong"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            resetForm();
            onIsOpenChange(open);
        }}>
            <DialogContent className="max-w-md">

                <DialogHeader>
                    <DialogTitle>
                        {initialData ? "Edit Manager" : "Add Manager"}
                    </DialogTitle>
                    <DialogDescription>
                        Manager Form
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-4" onSubmit={handleSubmit}>

                    <div>
                        <Label>Department*</Label>
                        <Select value={department} onValueChange={handleDepartmentChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {departmentList.map((dep) => (
                                    <SelectItem key={dep._id} value={dep._id}>
                                        {dep.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Employees</Label>

                        <div className="border rounded-md p-2 max-h-52 overflow-y-auto space-y-2">

                            {filteredEmployees.map((emp) => {

                                const isExisting = existingManagers.includes(emp._id);
                                const isSelected = selectedEmployees.includes(emp._id);

                                return (
                                    <div
                                        key={emp._id}
                                        onClick={() => toggleEmployee(emp._id)}
                                        className={`flex justify-between items-center p-2 rounded cursor-pointer transition
                                            ${isSelected ? "bg-green-100" : "hover:bg-gray-100"}
                                        `}
                                    >
                                        <span className="text-sm">
                                            {emp.fullName}
                                        </span>

                                        {(isExisting || isSelected) && (
                                            <span className="text-xs text-green-700 font-semibold">
                                                Selected
                                            </span>
                                        )}

                                    </div>
                                );
                            })}

                        </div>

                        {department === "none" && ( <p className="text-xs text-red-500 mt-1"> Please select a department</p>)}

                        {department !== "none" && filteredEmployees.length === 0 && ( <p className="text-xs text-red-500 mt-1"> No employees found </p> )}
                    </div>

                    <div className="flex gap-2">

                        <Button type="button" variant="secondary" className="w-full" onClick={() => { onIsOpenChange(false); resetForm(); }} >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={ loading || department === "none" || selectedEmployees.length === 0}>
                            {loading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {initialData ? "Update" : "Save"}
                        </Button>

                    </div>

                </form>

            </DialogContent>
        </Dialog>
    );
};

export default AddManagerForm;